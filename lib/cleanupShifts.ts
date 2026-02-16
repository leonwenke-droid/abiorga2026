import type { SupabaseClient } from "@supabase/supabase-js";

const SHIFT_DONE_POINTS = 10;

/** Heute als YYYY-MM-DD in Europe/Berlin (Kalendertag), damit Schichten ab Mitternacht als vergangen gelten. */
function getTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
}

/**
 * Vergibt Engagement-Punkte (shift_done) für alle Zuweisungen vergangener Schichten,
 * sofern noch nicht erfasst (z. B. durch manuelles „erledigt“).
 * Läuft nur, wenn jemand Dashboard oder Admin → Schichten aufruft.
 */
async function creditPastShiftAssignments(supabase: SupabaseClient) {
  const today = getTodayDateString();
  const { data: past } = await supabase
    .from("shifts")
    .select("id")
    .lt("date", today);
  if (!past?.length) return;

  const shiftIds = past.map((s) => s.id);
  const { data: assignments } = await supabase
    .from("shift_assignments")
    .select("id, user_id")
    .in("shift_id", shiftIds);

  if (!assignments?.length) return;

  const { data: existing } = await supabase
    .from("engagement_events")
    .select("source_id")
    .eq("event_type", "shift_done")
    .in(
      "source_id",
      assignments.map((a) => a.id)
    );

  const alreadyCredited = new Set((existing ?? []).map((e) => e.source_id as string));
  const toInsert = assignments.filter((a) => !alreadyCredited.has(a.id));

  for (const a of toInsert) {
    if (!a.user_id) continue;
    const { error } = await supabase.from("engagement_events").insert({
      user_id: a.user_id,
      event_type: "shift_done",
      points: SHIFT_DONE_POINTS,
      source_id: a.id
    });
    if (error) {
      console.error("[creditPastShiftAssignments] Insert engagement_events:", error);
    }
  }
}

/**
 * Verarbeitet vergangene Schichten: vergibt Engagement-Punkte (shift_done) an
 * zugewiesene Personen. Schichten und Zuweisungen werden nicht gelöscht und
 * bleiben zur Einsicht erhalten.
 */
export async function removePastShifts(supabase: SupabaseClient) {
  await creditPastShiftAssignments(supabase);
}
