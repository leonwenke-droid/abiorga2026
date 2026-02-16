"use client";

import { useState } from "react";
import ShiftEditModal from "./ShiftEditModal";
import SubmitButtonWithSpinner from "./SubmitButtonWithSpinner";
import { formatDateLabel } from "../lib/dateFormat";

type Member = { id: string; full_name: string; load_index?: number; responsibility_malus?: number };

type Props = {
  shifts: any[];
  profileNames: Map<string, string>;
  membersSortedByLoad: Member[];
  assignToShift: (shiftId: string, formData: FormData) => Promise<void>;
  deleteShift: (formData: FormData) => Promise<void>;
  deleteEventShifts: (formData: FormData) => Promise<void>;
  updateShift: (shiftId: string, formData: FormData) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
  replaceAssignment: (assignmentId: string, formData: FormData) => Promise<void>;
};

function timeStr(t: string | null | undefined): string {
  const s = String(t ?? "").trim();
  return s.slice(0, 5) || "–";
}

export default function ShiftPlanTableWithEdit({
  shifts,
  profileNames,
  membersSortedByLoad,
  assignToShift,
  deleteShift,
  deleteEventShifts,
  updateShift,
  removeAssignment,
  replaceAssignment
}: Props) {
  const [editingShift, setEditingShift] = useState<any | null>(null);

  const byDate = (shifts as any[]).reduce(
    (acc: Record<string, any[]>, s: any) => {
      const d = s.date;
      if (!acc[d]) acc[d] = [];
      acc[d].push(s);
      return acc;
    },
    {}
  );
  const dates = Object.keys(byDate).sort();

  const eventGroupKey = (eventName: string) =>
    String(eventName ?? "").trim().replace(/\s*–\s*[12]\.\s*Pause$/i, "").trim() || "—";

  const byDateAndEvent = (dateStr: string) => {
    const dayShifts = byDate[dateStr] ?? [];
    const map = new Map<string, any[]>();
    for (const s of dayShifts) {
      const key = eventGroupKey(s.event_name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  };

  return (
    <>
      <div className="flex flex-col gap-6 md:flex-row md:flex-wrap">
        {dates.map((dateStr) => {
          const dateLabel = formatDateLabel(dateStr);
          const eventGroups = byDateAndEvent(dateStr);
          return (
            <div
              key={dateStr}
              className="min-w-[320px] flex-1 overflow-x-auto rounded-lg border border-cyan-500/20 bg-card/40 p-3"
            >
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                {dateLabel}
              </h4>
              {eventGroups.map(([eventName, dayShifts]) => (
                <div key={`${dateStr}-${eventName}`} className="mb-4 last:mb-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-cyan-300">
                      {eventName || "—"}
                    </span>
                    <form action={deleteEventShifts} className="inline">
                      <input type="hidden" name="eventName" value={eventName} />
                      <input type="hidden" name="eventDate" value={dateStr} />
                      <SubmitButtonWithSpinner
                        className="inline-flex items-center gap-1.5 rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/30 disabled:opacity-70 disabled:pointer-events-none"
                        title="Gesamte Veranstaltung löschen"
                        loadingLabel="Löschen…"
                      >
                        Veranstaltung löschen
                      </SubmitButtonWithSpinner>
                    </form>
                  </div>
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-cyan-500/20 text-[11px] text-cyan-400/90">
                    <th className="py-1 pr-2 text-left">Veranstaltung</th>
                    <th className="py-1 pr-2 text-left">Uhrzeit</th>
                    <th className="py-1 pr-2 text-left">Ort</th>
                    <th className="py-1 pr-2 text-left">Infos</th>
                    <th className="py-1 pr-2 text-left">Zugewiesen</th>
                    <th className="py-1 pr-2 text-left">Status</th>
                    <th className="py-1 pr-2 text-left">Bearbeiten</th>
                    <th className="py-1 pr-2 text-left">Löschen</th>
                  </tr>
                </thead>
                <tbody>
                  {dayShifts.map((s: any) => {
                    const assignments = (s.shift_assignments ?? []) as {
                      id?: string;
                      status?: string;
                      user_id?: string;
                    }[];
                    const names = assignments.map(
                      (a) => profileNames.get(a.user_id ?? "") ?? "?"
                    );
                    const done = assignments.filter((a) => a.status === "erledigt").length;
                    const statusText =
                      done === assignments.length && assignments.length > 0
                        ? "erledigt"
                        : assignments.length > 0
                          ? `${done}/${assignments.length}`
                          : "–";
                    return (
                      <tr key={s.id} className="border-b border-cyan-500/10">
                        <td className="py-1.5 pr-2 font-medium">{s.event_name}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">
                          {timeStr(s.start_time)} – {timeStr(s.end_time)}
                        </td>
                        <td className="py-1.5 pr-2">{s.location ?? "–"}</td>
                        <td className="py-1.5 pr-2 max-w-[160px] text-cyan-200/90">
                          {s.notes ? (
                            <span title={s.notes} className="line-clamp-2">
                              {s.notes}
                            </span>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="py-1.5 pr-2">
                          {names.length > 0 ? names.join(", ") : "–"}
                        </td>
                        <td className="py-1.5 pr-2 text-cyan-400/80">{statusText}</td>
                        <td className="py-1.5 pr-2">
                          <button
                            type="button"
                            onClick={() => setEditingShift(s)}
                            className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/30"
                          >
                            Bearbeiten
                          </button>
                        </td>
                        <td className="py-1.5 pr-2">
                          <form action={deleteShift} className="inline">
                            <input type="hidden" name="shiftId" value={s.id} />
                            <SubmitButtonWithSpinner
                              className="inline-flex items-center gap-1.5 rounded bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-70 disabled:pointer-events-none"
                              title="Schicht entfernen"
                              loadingLabel="Entfernen…"
                            >
                              Entfernen
                            </SubmitButtonWithSpinner>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {editingShift && (
        <ShiftEditModal
          shift={{
            id: editingShift.id,
            event_name: editingShift.event_name ?? "",
            date: String(editingShift.date ?? ""),
            start_time: String(editingShift.start_time ?? ""),
            end_time: String(editingShift.end_time ?? ""),
            location: editingShift.location ?? null,
            notes: editingShift.notes ?? null
          }}
          assignments={(editingShift.shift_assignments ?? []).map((a: any) => ({
            id: a.id,
            user_id: a.user_id ?? "",
            status: a.status ?? "zugewiesen"
          }))}
          members={membersSortedByLoad.map((m) => ({
            id: m.id,
            full_name: m.full_name ?? ""
          }))}
          profileNames={profileNames}
          updateShift={updateShift}
          assignToShift={assignToShift}
          removeAssignment={removeAssignment}
          replaceAssignment={replaceAssignment}
          onClose={() => setEditingShift(null)}
        />
      )}
    </>
  );
}
