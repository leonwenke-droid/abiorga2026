import { unstable_noStore } from "next/cache";
import { createSupabaseServiceRoleClient } from "../../lib/supabaseServer";
import { removePastShifts } from "../../lib/cleanupShifts";
import { getDashboardDisplayNames } from "../../lib/displayName";
import { formatWeekRangeLabel, formatDateTimeForDisplay, getTodayDateString } from "../../lib/dateFormat";
import ShiftPlanWeekNav from "../../components/ShiftPlanWeekNav";
import type { WeekData } from "../../components/ShiftPlanWeekView";

export const dynamic = "force-dynamic";

type DashboardStats = {
  total_open: number;
  total_in_progress: number;
  total_completed: number;
  total_overdue: number;
};

async function getData() {
  unstable_noStore();
  const supabase = createSupabaseServiceRoleClient();

  // Zuerst Daten laden (inkl. Schichten für alle User inkl. neu angelegte)
  const [
    { data: treasury },
    { data: tasks },
    { data: shifts },
    { data: profiles },
    { data: committees }
  ] = await Promise.all([
    supabase
      .from("treasury_updates")
      .select("amount, created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("tasks").select("id, status, due_at"),
    supabase
      .from("shifts")
      .select(
        "id, event_name, date, start_time, end_time, location, notes, shift_assignments ( id, status, user_id )"
      )
      .order("date", { ascending: true }),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("committees").select("id, name").order("name")
  ]);

  // Aufräumen/Strafen nach dem Laden, damit Schichten auch bei Fehlern angezeigt werden
  try {
    await removePastShifts(supabase);
    await supabase.rpc("apply_task_missed_penalties");
  } catch (e) {
    console.error("[dashboard getData] cleanup/penalties:", e);
  }

  const aggregate: DashboardStats = (tasks ?? []).reduce(
    (acc: DashboardStats, t: any) => {
      const status = t.status as string | null;
      const dueAt = t.due_at ? new Date(t.due_at) : null;
      if (status === "offen") acc.total_open += 1;
      else if (status === "in_arbeit") acc.total_in_progress += 1;
      else if (status === "erledigt") acc.total_completed += 1;
      if (status !== "erledigt" && dueAt && dueAt < new Date()) {
        acc.total_overdue += 1;
      }
      return acc;
    },
    {
      total_open: 0,
      total_in_progress: 0,
      total_completed: 0,
      total_overdue: 0
    }
  );

  const profileNames = getDashboardDisplayNames(
    (profiles ?? []) as { id: string; full_name: string | null }[]
  );

  return {
    treasury: treasury as { amount: number; created_at: string } | null,
    aggregate,
    shifts: shifts ?? [],
    profileNames,
    committees: (committees ?? []) as { id: string; name: string }[]
  };
}

export default async function DashboardPage() {
  const { treasury, aggregate, shifts, profileNames, committees } = await getData();
  const livechartCommittees = committees.filter(
    (c) => !/Jahrgangssprecher/i.test(c.name)
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-cyan-400">
            Kassenstand
          </h2>
          <p className="text-2xl font-bold">
            {treasury ? treasury.amount.toLocaleString("de-DE") : "–"} €
          </p>
          <p className="mt-1 text-xs text-cyan-400/70">
            {treasury
              ? `Letztes Update: ${formatDateTimeForDisplay(treasury.created_at)}`
              : "Noch keine Einträge."}
          </p>
        </div>

        <div className="card">
          <h2 className="mb-2 text-sm font-semibold text-cyan-400">
            Aufgabenstatus gesamt
          </h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Offen</span>
              <span className="font-semibold">{aggregate.total_open}</span>
            </div>
            <div className="flex justify-between">
              <span>In Arbeit</span>
              <span className="font-semibold">
                {aggregate.total_in_progress}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Erledigt</span>
              <span className="font-semibold">
                {aggregate.total_completed}
              </span>
            </div>
            <div className="flex justify-between text-red-300">
              <span>Überfällig</span>
              <span className="font-semibold">{aggregate.total_overdue}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-2">
        <h2 className="mb-2 text-sm font-semibold text-cyan-400">
          Livecharts pro Komitee
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7">
          {livechartCommittees.map((c) => (
            <div
              key={c.id}
              className="h-16 min-w-0 rounded border border-cyan-500/20 bg-card/40 flex flex-col items-center justify-center px-1.5 py-1 text-center"
            >
              <span className="truncate w-full text-[10px] font-semibold text-cyan-400" title={c.name}>
                {c.name}
              </span>
              <span className="text-[9px] text-cyan-400/50">Chart</span>
            </div>
          ))}
          {livechartCommittees.length === 0 && (
            <p className="col-span-full py-2 text-xs text-cyan-400/70">
              Noch keine Komitees angelegt.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-4 text-sm font-semibold text-cyan-400">
          Schichtplan
        </h2>
        <p className="mb-4 text-xs text-cyan-400/70">
          Aktuelle Woche: Mit ← und → zur vorherigen bzw. nächsten Woche wechseln.
        </p>
        {(!shifts || shifts.length === 0) ? (
          <p className="text-cyan-400/70 text-xs">
            Noch keine Schichten im System angelegt.
          </p>
        ) : (
          (() => {
            const toDateKey = (d: any) => {
              if (d == null) return "";
              const str = typeof d === "string" ? d : new Date(d).toISOString();
              return str.slice(0, 10);
            };
            const byDate = (shifts as any[]).reduce(
              (acc: Record<string, any[]>, s: any) => {
                const d = toDateKey(s.date);
                if (!d) return acc;
                if (!acc[d]) acc[d] = [];
                acc[d].push(s);
                return acc;
              },
              {}
            );
            const getMonday = (dateStr: string) => {
              const ymd = dateStr.slice(0, 10);
              const d = new Date(ymd + "T12:00:00Z");
              const day = d.getUTCDay();
              const diff = day === 0 ? 6 : day - 1;
              d.setUTCDate(d.getUTCDate() - diff);
              return d.toISOString().slice(0, 10);
            };
            const weekKeys = new Set<string>();
            Object.keys(byDate).forEach((dateStr) => {
              const mon = getMonday(dateStr);
              if (mon) weekKeys.add(mon);
            });
            const todayStr = getTodayDateString();
            const todayMonday = getMonday(todayStr);
            weekKeys.add(todayMonday);
            for (let i = -2; i <= 4; i++) {
              const d = new Date(todayStr + "T12:00:00Z");
              d.setUTCDate(d.getUTCDate() + i * 7);
              weekKeys.add(getMonday(d.toISOString().slice(0, 10)));
            }
            const WEEKDAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
            const daySlots = (monday: string) => {
              const out: string[] = [];
              const d = new Date(monday + "Z");
              for (let i = 0; i < 7; i++) {
                const x = new Date(d);
                x.setUTCDate(d.getUTCDate() + i);
                out.push(x.toISOString().slice(0, 10));
              }
              return out;
            };
            const weeksData: WeekData[] = Array.from(weekKeys)
              .sort()
              .map((monday) => {
                const days = daySlots(monday);
                const weekLabel = formatWeekRangeLabel(monday, days[6]);
                return {
                  weekLabel,
                  monday,
                  days: days.map((dateStr, i) => {
                    const dayShifts = (byDate[dateStr] ?? []) as any[];
                    const sorted = [...dayShifts].sort(
                      (a, b) => String(a.start_time).localeCompare(String(b.start_time))
                    );
                    const first = sorted[0];
                    const dayTitle = first
                      ? ((first.event_name ?? "").replace(/\s*–\s*[12]\. Pause$/i, "").trim() || (first.event_name ?? ""))
                      : null;
                    return {
                      dateStr,
                      weekdayName: WEEKDAY_NAMES[i],
                      dayTitle: dayTitle || null,
                      location: first?.location ?? null,
                      notes: first?.notes ?? null,
                      shifts: sorted.map((s: any) => ({
                        id: s.id,
                        event_name: s.event_name ?? "",
                        start_time: String(s.start_time ?? ""),
                        end_time: String(s.end_time ?? ""),
                        assignmentUserIds: ((s.shift_assignments ?? []) as { user_id?: string }[]).map(
                          (a) => a.user_id ?? ""
                        ).filter(Boolean)
                      }))
                    };
                  })
                };
              });
            const currentWeekIndex = weeksData.findIndex((w) => w.monday === todayMonday);
            const profileNamesObj: Record<string, string> = {};
            profileNames.forEach((value, key) => {
              profileNamesObj[key] = value;
            });
            return (
              <ShiftPlanWeekNav
                weeks={weeksData}
                currentWeekIndex={currentWeekIndex >= 0 ? currentWeekIndex : 0}
                profileNames={profileNamesObj}
              />
            );
          })()
        )}
      </section>
    </div>
  );
}

