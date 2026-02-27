"use client";

import { useState } from "react";
import { addMemberAction } from "./actions";

type Committee = { id: string; name: string };

export default function AddMemberForm({
  orgSlug,
  committees
}: {
  orgSlug: string;
  committees: Committee[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [committeeId, setCommitteeId] = useState("");
  const [asLead, setAsLead] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName.trim();
    if (!name) {
      setError("Name darf nicht leer sein.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    const { error: err } = await addMemberAction(orgSlug, name, {
      email: email.trim() || undefined,
      committeeId: committeeId || null,
      asLead
    });
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccess(true);
    setFullName("");
    setEmail("");
    setCommitteeId("");
    setAsLead(false);
    window.location.reload();
  };

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-card p-4">
      <h2 className="text-sm font-semibold text-cyan-100">Mitglied manuell hinzufügen</h2>
      <p className="mt-1 text-xs text-cyan-400/80">
        Name angeben (Pflicht), optional Komitee. E-Mail nur bei Komiteeleitung. Das Mitglied erscheint direkt in der Liste.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-cyan-400">Name (Vor- und Nachname)</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="z. B. Max Mustermann"
            className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-cyan-300">
          <input
            type="checkbox"
            checked={asLead}
            onChange={(e) => setAsLead(e.target.checked)}
            className="rounded border-cyan-500/50"
          />
          Als Lead (Komiteeleitung) hinzufügen
        </label>
        {asLead && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-cyan-400">E-Mail (für Komiteeleitung)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@beispiel.de"
              className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
            />
          </div>
        )}
        {committees.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-cyan-400">Komitee (optional)</label>
            <select
              value={committeeId}
              onChange={(e) => setCommitteeId(e.target.value)}
              className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
            >
              <option value="">— Keins —</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
        {success && <p className="text-xs text-green-400">Mitglied hinzugefügt.</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          {loading ? "Wird hinzugefügt…" : "Mitglied hinzufügen"}
        </button>
      </form>
    </div>
  );
}
