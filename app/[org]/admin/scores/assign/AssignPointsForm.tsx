"use client";

import { useState } from "react";
import { assignPoints } from "./actions";

type Member = { id: string; full_name: string };

export default function AssignPointsForm({
  orgSlug,
  members
}: {
  orgSlug: string;
  members: Member[];
}) {
  const [profileId, setProfileId] = useState("");
  const [points, setPoints] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(points, 10);
    if (!profileId || isNaN(num)) {
      setMessage({ type: "error", text: "Mitglied wählen und Punkte (Zahl) angeben." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const result = await assignPoints(orgSlug, profileId, num);
    setLoading(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: "Punkte wurden vergeben." });
    setPoints("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-cyan-500/30 bg-card p-6">
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">
          Mitglied
        </label>
        <select
          required
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="w-full rounded border border-cyan-500/30 bg-background p-2 text-sm"
        >
          <option value="">— wählen —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">
          Punkte (positiv oder negativ)
        </label>
        <input
          type="number"
          required
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="z. B. 10 oder -5"
          className="w-full rounded border border-cyan-500/30 bg-background p-2 text-sm"
        />
      </div>
      {message && (
        <p className={message.type === "error" ? "text-sm text-red-300" : "text-sm text-emerald-300"}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
      >
        {loading ? "Wird gespeichert…" : "Punkte vergeben"}
      </button>
    </form>
  );
}
