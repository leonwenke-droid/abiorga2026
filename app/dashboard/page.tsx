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

type ActivityStats = {
  shifts_done_30d: number;
  tasks_done_30d: number;
  materials_30d: number;
  materials_small_30d: number;
  materials_medium_30d: number;
  materials_large_30d: number;
  active_participants_30d: number;
};

async function getData() {
  unstable_noStore();
  const supabase = createSupabaseServiceRoleClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  // Zuerst Daten laden (inkl. Schichten für alle User inkl. neu angelegte)
  const [
    { data: treasury },
    { data: tasks },
    { data: shifts },
    { data: profiles },
    { data: committees },
    { data: engagementEvents }
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
        "id, event_name, date, start_time, end_time, location, notes, shift_assignments ( id, status, user_id, replacement_user_id )"
      )
      .order("date", { ascending: true }),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("committees").select("id, name").order("name"),
    supabase.from("engagement_events").select("user_id, event_type, created_at").gte("created_at", since)
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

  const events = (engagementEvents ?? []) as { user_id: string; event_type: string }[];
  const materialEvents = events.filter((e) =>
    ["material_small", "material_medium", "material_large"].includes(e.event_type)
  );

  const positiveEventTypes = new Set(["shift_done", "task_done", "material_small", "material_medium", "material_large"]);
  const activeUserIds = events
    .filter((e) => e.user_id && positiveEventTypes.has(e.event_type))
    .map((e) => e.user_id);

  const activity: ActivityStats = {
    shifts_done_30d: events.filter((e) => e.event_type === "shift_done").length,
    tasks_done_30d: events.filter((e) => e.event_type === "task_done").length,
    materials_30d: materialEvents.length,
    materials_small_30d: materialEvents.filter((e) => e.event_type === "material_small").length,
    materials_medium_30d: materialEvents.filter((e) => e.event_type === "material_medium").length,
    materials_large_30d: materialEvents.filter((e) => e.event_type === "material_large").length,
    active_participants_30d: new Set(activeUserIds).size
  };

  return {
    treasury: treasury as { amount: number; created_at: string } | null,
    aggregate,
    activity,
    shifts: shifts ?? [],
    profileNames,
    committees: (committees ?? []) as { id: string; name: string }[]
  };
}

export default async function DashboardPage() {
  const { treasury, aggregate, activity, shifts, profileNames, committees } = await getData();
  const livechartCommittees = committees.filter(
    (c) => !/Jahrgangssprecher/i.test(c.name)
  );

  return (
    <div className="space-y-8">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-cyan-200 tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-cyan-400/90">
          Überblick über Kasse, Aufgaben und Schichten
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
          Kennzahlen
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-cyan-500/25 bg-card/50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/15 text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-medium text-cyan-400/90">Kassenstand</h3>
                <p className="text-xl font-bold text-cyan-100">
                  {treasury ? treasury.amount.toLocaleString("de-DE") : "–"} €
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-cyan-400/70 border-t border-cyan-500/15 pt-2">
              {treasury
                ? `Zuletzt aktualisiert: ${formatDateTimeForDisplay(treasury.created_at)}`
                : "Noch keine Einträge"}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xs font-medium text-cyan-400/90">Aktivität · letzte 30 Tage</h3>
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">Schichten erledigt</span>
                <span className="font-semibold tabular-nums text-cyan-200">{activity.shifts_done_30d}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">Aufgaben erledigt</span>
                <span className="font-semibold tabular-nums text-cyan-200">{activity.tasks_done_30d}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">Materialbeschaffungen</span>
                <span className="font-semibold tabular-nums text-cyan-200">{activity.materials_30d}</span>
              </li>
              {activity.materials_30d > 0 && (
                <li className="flex justify-between items-center pl-3 text-cyan-400/70">
                  <span>Klein · Mittel · Groß</span>
                  <span className="tabular-nums">{activity.materials_small_30d} / {activity.materials_medium_30d} / {activity.materials_large_30d}</span>
                </li>
              )}
              <li className="flex justify-between items-center border-t border-cyan-500/15 pt-2 mt-2">
                <span className="text-cyan-300/90 font-medium">Aktive Teilnehmer</span>
                <span className="font-semibold tabular-nums text-cyan-200">{activity.active_participants_30d}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-cyan-500/25 bg-card/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h3 className="text-xs font-medium text-cyan-400/90">Aufgabenstatus</h3>
            </div>
            <ul className="space-y-2 text-xs">
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">Offen</span>
                <span className="font-semibold tabular-nums px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200">{aggregate.total_open}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">In Arbeit</span>
                <span className="font-semibold tabular-nums px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">{aggregate.total_in_progress}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-cyan-300/90">Erledigt</span>
                <span className="font-semibold tabular-nums px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">{aggregate.total_completed}</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-red-300/90">Überfällig</span>
                <span className="font-semibold tabular-nums px-2 py-0.5 rounded bg-red-500/20 text-red-300">{aggregate.total_overdue}</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {false && (
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
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
            Schichtplan
          </h2>
          <p className="mt-1 text-xs text-cyan-400/80">
            Mit ← / → zwischen Wochen wechseln · Tageskarte antippen für Details
          </p>
        </div>
        <div className="rounded-xl border border-cyan-500/25 bg-card/50 p-5">
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
                        assignments: ((s.shift_assignments ?? []) as { id: string; status: string; user_id?: string; replacement_user_id?: string | null }[]).map(
                          (a) => ({
                            id: a.id,
                            status: a.status ?? "zugewiesen",
                            user_id: a.user_id ?? null,
                            replacement_user_id: a.replacement_user_id ?? null
                          })
                        )
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
        </div>
      </section>
    </div>
  );
}

