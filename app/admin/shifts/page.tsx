import { cookies } from "next/headers";
import { revalidatePath, unstable_noStore } from "next/cache";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createSupabaseServiceRoleClient } from "../../../lib/supabaseServer";
import { removePastShifts } from "../../../lib/cleanupShifts";
import CreateShiftsForm from "../../../components/CreateShiftsForm";
import ShiftPlanTableWithEdit from "../../../components/ShiftPlanTableWithEdit";

export const dynamic = "force-dynamic";

type SimpleShift = { id: string; required_slots: number | null; date?: string };

const COOLDOWN_DAYS = 3;

/**
 * Ermittelt User-IDs, die in den letzten COOLDOWN_DAYS vor shiftDate eine Schicht hatten.
 * Diese Personen dürfen an shiftDate keine weitere Schicht bekommen.
 */
async function getUsersInCooldown(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  shiftDateStr: string
): Promise<Set<string>> {
  const shiftDate = new Date(shiftDateStr + "T12:00:00Z");
  const minD = new Date(shiftDate);
  minD.setUTCDate(minD.getUTCDate() - COOLDOWN_DAYS);
  const maxD = new Date(shiftDate);
  maxD.setUTCDate(maxD.getUTCDate() - 1);
  const minStr = minD.toISOString().slice(0, 10);
  const maxStr = maxD.toISOString().slice(0, 10);

  const { data: cooldownShifts } = await service
    .from("shifts")
    .select("id")
    .gte("date", minStr)
    .lte("date", maxStr);

  const shiftIds = (cooldownShifts ?? []).map((s: { id: string }) => s.id);
  if (shiftIds.length === 0) return new Set();

  const { data: assignments } = await service
    .from("shift_assignments")
    .select("user_id")
    .in("shift_id", shiftIds);

  return new Set(
    (assignments ?? []).map((a: { user_id: string }) => a.user_id as string)
  );
}

/**
 * Auto-Zuteilung: Personen mit niedrigstem Engagement-Score werden zuerst eingeteilt.
 * globallyUsed verhindert Mehrfach-Zuteilung innerhalb derselben Batch.
 * Cooldown: Wer in den letzten 3 Tagen eine Schicht hatte, wird nicht erneut eingeteilt.
 */
async function autoAssignForShifts(
  service: ReturnType<typeof createSupabaseServiceRoleClient>,
  shifts: SimpleShift[]
) {
  if (!shifts.length) return;

  const [{ data: profiles }, { data: scores }] = await Promise.all([
    service.from("profiles").select("id").order("full_name"),
    service.from("engagement_scores").select("user_id, score")
  ]);

  const scoreMap = new Map(
    (scores ?? []).map((s) => [s.user_id as string, Number(s.score) ?? 0])
  );
  const membersWithScore = (profiles ?? []).map((p) => ({
    id: p.id as string,
    score: scoreMap.get(p.id as string) ?? 0
  }));
  membersWithScore.sort((a, b) => a.score - b.score);

  const globallyUsed = new Set<string>();

  for (const shift of shifts) {
    const required = shift.required_slots ?? 0;
    if (required <= 0) continue;

    const shiftDate = shift.date;
    const cooldownUsers =
      shiftDate != null
        ? await getUsersInCooldown(service, shiftDate)
        : new Set<string>();

    const { data: existing } = await service
      .from("shift_assignments")
      .select("user_id")
      .eq("shift_id", shift.id);
    const alreadyAssigned = new Set<string>(
      (existing ?? []).map((a: any) => a.user_id as string)
    );

    const toAssign = membersWithScore.filter(
      (m) =>
        !alreadyAssigned.has(m.id) &&
        !globallyUsed.has(m.id) &&
        !cooldownUsers.has(m.id)
    ).slice(0, required);

    if (!toAssign.length) continue;

    const rows = toAssign.map((m) => ({
      shift_id: shift.id,
      user_id: m.id,
      status: "zugewiesen"
    }));

    const { error } = await service.from("shift_assignments").insert(rows);
    if (!error) {
      toAssign.forEach((m) => globallyUsed.add(m.id));
    }
  }
}

async function createShifts(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  "use server";
  try {
    const type = formData.get("type")?.toString() || "pausenverkauf";
    const date = formData.get("date")?.toString();
    const eventName = formData.get("event_name")?.toString().trim() || "";
    const startTime = formData.get("start_time")?.toString() || "";
    const endTime = formData.get("end_time")?.toString() || "";
    const location = formData.get("location")?.toString().trim() || null;
    const notes = formData.get("notes")?.toString().trim() || null;
    const requiredSlots = Number(
      formData.get("required_slots")?.toString() || "0"
    ) || 0;

    if (!date) {
      return { error: "Datum ist erforderlich." };
    }
    if (!eventName) {
      return { error: "Titel ist erforderlich." };
    }

    const supabase = createServerComponentClient({ cookies });
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const service = createSupabaseServiceRoleClient();

    // created_by muss profiles.id sein, nicht auth user id
    let createdBy: string | null = null;
    if (user?.id) {
      const { data: profile } = await service
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      createdBy = profile?.id ?? null;
    }

    if (type === "pausenverkauf") {
      const rows: {
        event_name: string;
        date: string;
        start_time: string;
        end_time: string;
        location: string | null;
        notes: string | null;
        created_by: string | null;
        required_slots: number;
      }[] = [
        {
          event_name: `${eventName} – 1. Pause`,
          date,
          start_time: "09:15",
          end_time: "09:35",
          location,
          notes,
          created_by: createdBy,
          required_slots: requiredSlots
        },
        {
          event_name: `${eventName} – 2. Pause`,
          date,
          start_time: "11:05",
          end_time: "11:30",
          location,
          notes,
          created_by: createdBy,
          required_slots: requiredSlots
        }
      ];
      const { data: created, error } = await service
        .from("shifts")
        .insert(rows)
        .select("id, required_slots, date");
      if (error || !created?.length) {
        console.error(error);
        return {
          error:
            error?.message ||
            "Schichten für Pausenverkauf konnten nicht angelegt werden. Ist die Spalte required_slots in der Tabelle shifts vorhanden?"
        };
      }
      await autoAssignForShifts(service, created as SimpleShift[]);
    } else {
      if (!startTime || !endTime) {
        return {
          error: "Zeitrahmen (Start und Ende) sind für Veranstaltungen erforderlich."
        };
      }
      const intervalMinutes = Math.max(1, Number(formData.get("interval_minutes")?.toString() || "120") || 120);

      const toMinutes = (hhmm: string) => {
        const [h, m] = hhmm.split(":").map(Number);
        return (h ?? 0) * 60 + (m ?? 0);
      };
      const toHHMM = (minutes: number) => {
        const h = Math.floor(minutes / 60) % 24;
        const m = minutes % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      const startMin = toMinutes(startTime);
      const endMin = toMinutes(endTime);
      if (endMin <= startMin) {
        return { error: "Endzeit muss nach der Startzeit liegen." };
      }

      const rows: { event_name: string; date: string; start_time: string; end_time: string; location: string | null; notes: string | null; created_by: string | null; required_slots: number }[] = [];
      let slotStart = startMin;
      while (slotStart < endMin) {
        const slotEnd = Math.min(slotStart + intervalMinutes, endMin);
        rows.push({
          event_name: eventName,
          date,
          start_time: toHHMM(slotStart),
          end_time: toHHMM(slotEnd),
          location,
          notes,
          created_by: createdBy,
          required_slots: requiredSlots
        });
        slotStart = slotEnd;
      }

      const { data: created, error } = await service
        .from("shifts")
        .insert(rows)
        .select("id, required_slots, date");
      if (error || !created?.length) {
        console.error(error);
        return {
          error:
            error?.message ||
            "Veranstaltungs-Schichten konnten nicht angelegt werden."
        };
      }
      await autoAssignForShifts(service, created as SimpleShift[]);
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { error: message };
  }
}

async function assignToShift(shiftId: string, formData: FormData) {
  "use server";
  const userId = formData.get("user_id")?.toString();
  if (!userId) return;
  const service = createSupabaseServiceRoleClient();
  const { error } = await service.from("shift_assignments").insert({
    shift_id: shiftId,
    user_id: userId,
    status: "zugewiesen"
  });
  if (!error) revalidatePath("/admin/shifts");
}

async function updateShift(shiftId: string, formData: FormData) {
  "use server";
  const eventName = formData.get("event_name")?.toString().trim();
  const date = formData.get("date")?.toString();
  const startTime = formData.get("start_time")?.toString();
  const endTime = formData.get("end_time")?.toString();
  const location = formData.get("location")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;

  if (!eventName || !date || !startTime || !endTime) return;

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from("shifts")
    .update({
      event_name: eventName,
      date,
      start_time: startTime,
      end_time: endTime,
      location,
      notes
    })
    .eq("id", shiftId);

  if (!error) {
    revalidatePath("/admin/shifts");
    revalidatePath("/dashboard", "layout");
  }
}

/** Veranstaltung bearbeiten: erste Schicht voll, alle Schichten der Gruppe bekommen Ort + Infos (Dashboard zeigt aktualisierte Infos). */
async function updateEventGroup(shiftIds: string[], formData: FormData) {
  "use server";
  const eventName = formData.get("event_name")?.toString().trim();
  const date = formData.get("date")?.toString();
  const startTime = formData.get("start_time")?.toString();
  const endTime = formData.get("end_time")?.toString();
  const location = formData.get("location")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;
  if (!eventName || !date || !startTime || !endTime || !shiftIds?.length) return;

  const service = createSupabaseServiceRoleClient();
  const [firstId, ...restIds] = shiftIds;
  const { error: errFirst } = await service
    .from("shifts")
    .update({
      event_name: eventName,
      date,
      start_time: startTime,
      end_time: endTime,
      location,
      notes
    })
    .eq("id", firstId);
  if (errFirst) return;

  for (const id of restIds) {
    await service.from("shifts").update({ location, notes }).eq("id", id);
  }
  revalidatePath("/admin/shifts");
  revalidatePath("/dashboard", "layout");
}

async function removeAssignment(assignmentId: string) {
  "use server";
  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from("shift_assignments")
    .delete()
    .eq("id", assignmentId);

  if (!error) {
    revalidatePath("/admin/shifts");
    revalidatePath("/dashboard");
  }
}

async function replaceAssignment(assignmentId: string, formData: FormData) {
  "use server";
  const newUserId = formData.get("user_id")?.toString();
  if (!newUserId) return;

  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from("shift_assignments")
    .update({ user_id: newUserId })
    .eq("id", assignmentId);

  if (!error) {
    revalidatePath("/admin/shifts");
    revalidatePath("/dashboard");
  }
}

const SHIFT_DONE_POINTS = 10;
const REPLACEMENT_ARRANGED_POINTS = 4; // Weniger als Schicht selbst, da Ersatz besorgt
const SHIFT_MISSED_PENALTY = -15; // Nicht angetreten, kein Ersatz (kein Becheid)

/** Zugewiesene Person ist angetreten → Status erledigt, Trigger vergibt shift_done. */
async function markAssignmentAttended(assignmentId: string) {
  "use server";
  const service = createSupabaseServiceRoleClient();
  const { error } = await service
    .from("shift_assignments")
    .update({ status: "erledigt" })
    .eq("id", assignmentId);
  if (!error) {
    revalidatePath("/admin/shifts");
    revalidatePath("/dashboard");
  }
}

/** Zugewiesene Person nicht angetreten. Mit Ersatz: Original +weniger Punkte (Ersatz besorgt), Ersatz +volle Punkte. Ohne Ersatz: Abzug (kein Becheid). */
async function markAssignmentNotAttended(
  assignmentId: string,
  replacementUserId: string | null
) {
  "use server";
  const service = createSupabaseServiceRoleClient();
  const { data: assignment } = await service
    .from("shift_assignments")
    .select("user_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment?.user_id) return;

  const { error: updateErr } = await service
    .from("shift_assignments")
    .update({
      status: "abgesagt",
      replacement_user_id: replacementUserId || null
    })
    .eq("id", assignmentId);
  if (updateErr) return;

  const originalUserId = assignment.user_id as string;
  if (replacementUserId) {
    await service.from("engagement_events").insert({ user_id: originalUserId, event_type: "replacement_arranged", points: REPLACEMENT_ARRANGED_POINTS, source_id: assignmentId });
    await service.from("engagement_events").insert({ user_id: replacementUserId, event_type: "shift_done", points: SHIFT_DONE_POINTS, source_id: assignmentId });
  } else {
    await service.from("engagement_events").insert({
      user_id: originalUserId,
      event_type: "shift_missed",
      points: SHIFT_MISSED_PENALTY,
      source_id: assignmentId
    });
  }
  revalidatePath("/admin/shifts");
  revalidatePath("/dashboard");
}

/** Status nachträglich ändern (z. B. von erledigt auf nicht angetreten). Entfernt alte Engagement-Einträge, setzt neuen Status, Trigger/App setzen Scores. */
async function updateAssignmentStatus(
  assignmentId: string,
  status: "erledigt" | "abgesagt",
  replacementUserId: string | null
) {
  "use server";
  const service = createSupabaseServiceRoleClient();
  const { data: assignment } = await service
    .from("shift_assignments")
    .select("user_id")
    .eq("id", assignmentId)
    .single();
  if (!assignment?.user_id) return;

  await service.from("engagement_events").delete().eq("source_id", assignmentId);

  const { error: updateErr } = await service
    .from("shift_assignments")
    .update({
      status,
      replacement_user_id: status === "abgesagt" ? replacementUserId : null
    })
    .eq("id", assignmentId);
  if (updateErr) return;

  const originalUserId = assignment.user_id as string;
  if (status === "abgesagt") {
    if (replacementUserId) {
      await service.from("engagement_events").insert({ user_id: originalUserId, event_type: "replacement_arranged", points: REPLACEMENT_ARRANGED_POINTS, source_id: assignmentId });
      await service.from("engagement_events").insert({ user_id: replacementUserId, event_type: "shift_done", points: SHIFT_DONE_POINTS, source_id: assignmentId });
    } else {
      await service.from("engagement_events").insert({ user_id: originalUserId, event_type: "shift_missed", points: SHIFT_MISSED_PENALTY, source_id: assignmentId });
    }
  }
  revalidatePath("/admin/shifts");
  revalidatePath("/dashboard");
}

async function deleteShift(formData: FormData) {
  "use server";
  const shiftId = formData.get("shiftId")?.toString();
  if (!shiftId) return;
  const service = createSupabaseServiceRoleClient();
  await service.from("shift_assignments").delete().eq("shift_id", shiftId);
  await service.from("shifts").delete().eq("id", shiftId);
  revalidatePath("/admin/shifts");
  revalidatePath("/dashboard");
}

/**
 * Löscht alle Schichten einer Veranstaltung (date + event_name exakt oder mit Suffix wie " – 1. Pause").
 * Damit ist z. B. Pausenverkauf komplett löschbar (beide Pausen auf einmal).
 */
async function deleteEventShifts(formData: FormData) {
  "use server";
  const baseEventName = formData.get("eventName")?.toString();
  const date = formData.get("eventDate")?.toString();
  if (!baseEventName || !date) return;
  const service = createSupabaseServiceRoleClient();
  const { data: allOnDate } = await service
    .from("shifts")
    .select("id, event_name")
    .eq("date", date);
  const toDelete = (allOnDate ?? []).filter(
    (s: { id: string; event_name: string }) =>
      s.event_name === baseEventName || s.event_name.startsWith(baseEventName + " – ")
  );
  const ids = toDelete.map((s: { id: string }) => s.id);
  if (ids.length === 0) return;
  await service.from("shift_assignments").delete().in("shift_id", ids);
  await service.from("shifts").delete().in("id", ids);
  revalidatePath("/admin/shifts");
  revalidatePath("/dashboard");
}

export default async function ShiftsPage() {
  unstable_noStore();
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return (
      <p className="text-sm text-amber-300">
        Session nicht erkannt. Bitte <a href="/login" className="underline">erneut einloggen</a>.
      </p>
    );
  }

  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single();

  if (!profile || !["admin", "lead"].includes(profile.role)) {
    return (
      <p className="text-sm text-red-300">
        Zugriff nur für Admins & Komiteeleitungen.
      </p>
    );
  }

  await removePastShifts(service);

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin"
  });

  const [
    { data: shiftsRaw, error: shiftsError },
    { data: assignmentsRaw },
    { data: profiles },
    { data: counters }
  ] = await Promise.all([
    service
      .from("shifts")
      .select("id, event_name, date, start_time, end_time, location, notes")
      .order("date", { ascending: true }),
    service
      .from("shift_assignments")
      .select("id, shift_id, status, user_id, replacement_user_id"),
    service.from("profiles").select("id, full_name").order("full_name"),
    service.from("user_counters").select("user_id, load_index, responsibility_malus")
  ]);

  if (shiftsError) {
    console.error("[admin/shifts] Schichten laden:", shiftsError);
  }

  const assignmentsByShift = new Map<
    string,
    { id: string; status: string; user_id: string; replacement_user_id: string | null }[]
  >();
  for (const a of assignmentsRaw ?? []) {
    const sid = (a as { shift_id: string }).shift_id;
    if (!sid) continue;
    if (!assignmentsByShift.has(sid)) assignmentsByShift.set(sid, []);
    assignmentsByShift.get(sid)!.push({
      id: (a as { id: string }).id,
      status: (a as { status: string }).status ?? "zugewiesen",
      user_id: (a as { user_id: string }).user_id ?? "",
      replacement_user_id: (a as { replacement_user_id?: string }).replacement_user_id ?? null
    });
  }
  const shifts = (shiftsRaw ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    shift_assignments: assignmentsByShift.get((s.id as string) ?? "") ?? []
  }));

  const loadMap = new Map(
    (counters ?? []).map((c) => [
      c.user_id as string,
      { load: Number(c.load_index) ?? 0, malus: Number(c.responsibility_malus) ?? 0 }
    ])
  );
  const membersSortedByLoad = (profiles ?? [])
    .map((p) => {
      const c = loadMap.get(p.id) ?? { load: 0, malus: 0 };
      return {
        id: p.id,
        full_name: p.full_name,
        load_index: c.load,
        responsibility_malus: c.malus
      };
    })
    .sort((a, b) => a.load_index - b.load_index);

  const profileNames = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-cyan-400">
        Schichten & Auto-Zuteilung
      </h2>
      <section className="card space-y-2 sm:space-y-3 text-xs">
        <h3 className="text-xs font-semibold text-cyan-400">Neue Schichten</h3>
        <p className="text-cyan-100/80 text-[11px] hidden sm:block">
          Pausenverkauf (1. + 2. Pause) oder einzelne Veranstaltung.
        </p>
        <CreateShiftsForm action={createShifts} />
      </section>
      <section className="rounded-xl border border-cyan-500/15 bg-card/50 shadow-sm overflow-hidden">
        <div className="border-b border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
          <h3 className="text-sm font-semibold text-cyan-300">Schichtplan</h3>
          <p className="text-[11px] text-cyan-400/70 mt-0.5">Vergangene Schichten: Antreten bestätigen oder Ersatz eintragen.</p>
        </div>
        <div className="p-4">
        {shiftsError ? (
          <p className="text-xs text-red-300">{shiftsError.message}</p>
        ) : (!shifts || shifts.length === 0) ? (
          <p className="text-sm text-cyan-400/70">Noch keine Schichten. Formular oben nutzen.</p>
        ) : (
          <ShiftPlanTableWithEdit
            shifts={shifts}
            todayStr={todayStr}
            profileNames={profileNames}
            membersSortedByLoad={membersSortedByLoad}
            assignToShift={assignToShift}
            deleteShift={deleteShift}
            deleteEventShifts={deleteEventShifts}
            updateShift={updateShift}
            updateEventGroup={updateEventGroup}
            removeAssignment={removeAssignment}
            replaceAssignment={replaceAssignment}
            markAssignmentAttended={markAssignmentAttended}
            markAssignmentNotAttended={markAssignmentNotAttended}
            updateAssignmentStatus={updateAssignmentStatus}
          />
        )}
        </div>
      </section>
    </div>
  );
}
