"use client";

import SubmitButtonWithSpinner from "./SubmitButtonWithSpinner";

type Shift = {
  id: string;
  event_name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  notes: string | null;
};

type Assignment = { id: string; user_id: string; status: string };

type Member = { id: string; full_name: string };

type Props = {
  shift: Shift;
  assignments: Assignment[];
  members: Member[];
  profileNames: Map<string, string>;
  updateShift: (shiftId: string, formData: FormData) => Promise<void>;
  assignToShift: (shiftId: string, formData: FormData) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
  replaceAssignment: (assignmentId: string, formData: FormData) => Promise<void>;
  onClose: () => void;
};

function timeForInput(t: string | null | undefined): string {
  const s = String(t ?? "").trim();
  return s.slice(0, 5) || "09:00";
}

function dateForInput(d: string | null | undefined): string {
  const s = String(d ?? "").trim();
  return s.slice(0, 10) || "";
}

export default function ShiftEditModal({
  shift,
  assignments,
  members,
  profileNames,
  updateShift,
  assignToShift,
  removeAssignment,
  replaceAssignment,
  onClose
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Schicht bearbeiten"
    >
      <div
        className="rounded-xl border border-cyan-500/30 bg-card shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-cyan-500/20 bg-card/80 px-4 py-3 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-semibold text-cyan-400">
            Schicht bearbeiten
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-cyan-400 hover:bg-cyan-500/20 focus:outline-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          <form
            action={async (formData) => {
              await updateShift(shift.id, formData);
              onClose();
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                Veranstaltung
              </label>
              <input
                type="text"
                name="event_name"
                required
                defaultValue={shift.event_name}
                className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                  Datum
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={dateForInput(shift.date)}
                  className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                  Uhrzeit
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name="start_time"
                    required
                    defaultValue={timeForInput(shift.start_time)}
                    className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
                  />
                  <span className="text-cyan-400/80 text-xs">–</span>
                  <input
                    type="time"
                    name="end_time"
                    required
                    defaultValue={timeForInput(shift.end_time)}
                    className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                Ort
              </label>
              <input
                type="text"
                name="location"
                defaultValue={shift.location ?? ""}
                placeholder="z.B. Mensa, Aula …"
                className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-cyan-400 block mb-1">
                Infos
              </label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={shift.notes ?? ""}
                placeholder="Infos für den Jahrgang …"
                className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs resize-y"
              />
            </div>
            <SubmitButtonWithSpinner
              className="inline-flex items-center gap-1.5 rounded bg-cyan-500/30 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/40 disabled:opacity-70 disabled:pointer-events-none"
              loadingLabel="Speichern…"
            >
              Änderungen speichern
            </SubmitButtonWithSpinner>
          </form>

          <div className="border-t border-cyan-500/20 pt-3">
            <p className="text-[11px] font-semibold text-cyan-400 mb-2">
              Zugewiesene Personen
            </p>
            {assignments.length === 0 ? (
              <p className="text-xs text-cyan-400/70 mb-2">Noch niemand zugewiesen.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded border border-cyan-500/20 bg-card/40 px-3 py-2"
                  >
                    <span className="flex-1 text-xs text-cyan-200">
                      {profileNames.get(a.user_id ?? "") ?? "–"}
                    </span>
                    <form
                      action={async (formData) => {
                        const uid = formData.get("user_id")?.toString();
                        if (uid) {
                          await replaceAssignment(a.id, formData);
                          onClose();
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="user_id"
                        className="rounded border border-cyan-500/30 bg-card/60 px-2 py-1 text-[11px]"
                      >
                        <option value="">Ersetzen durch …</option>
                        {members
                          .filter((m) => m.id !== a.user_id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name}
                            </option>
                          ))}
                      </select>
                      <SubmitButtonWithSpinner
                        className="inline-flex items-center gap-1.5 rounded bg-cyan-500/20 px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-70"
                        loadingLabel="…"
                      >
                        Ersetzen
                      </SubmitButtonWithSpinner>
                    </form>
                    <form
                      action={async () => {
                        await removeAssignment(a.id);
                        onClose();
                      }}
                    >
                      <SubmitButtonWithSpinner
                        className="inline-flex items-center gap-1.5 rounded bg-red-500/20 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/30 disabled:opacity-70"
                        title="Person entfernen"
                        loadingLabel="…"
                      >
                        Entfernen
                      </SubmitButtonWithSpinner>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form
              action={async (formData) => {
                const uid = formData.get("user_id")?.toString();
                if (uid) {
                  await assignToShift(shift.id, formData);
                  onClose();
                }
              }}
              className="flex items-center gap-2 mt-2"
            >
              <select
                name="user_id"
                className="rounded border border-cyan-500/30 bg-card/60 px-2 py-1 text-xs"
              >
                <option value="">Person hinzufügen …</option>
                {members
                  .filter((m) => !assignments.some((a) => a.user_id === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
              </select>
              <SubmitButtonWithSpinner
                className="inline-flex items-center gap-1.5 rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-70"
                loadingLabel="Hinzufügen…"
              >
                Hinzufügen
              </SubmitButtonWithSpinner>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
