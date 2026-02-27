"use client";

import { useState } from "react";
import { updateMemberNameAction, updateMemberCommitteeAction, updateMemberRoleAction, setMemberAsLeadAction, deleteMemberAction, resendLeadInviteAction } from "./actions";

type Committee = { id: string; name: string };
type Member = {
  id: string;
  full_name: string | null;
  role?: string;
  committee_id?: string | null;
  email?: string | null;
  auth_user_id?: string | null;
  committee?: { name?: string } | null;
};

export default function MemberRow({
  orgSlug,
  member,
  committees,
  currentAuthUserId = null,
  inviteStatus
}: {
  orgSlug: string;
  member: Member;
  committees: Committee[];
  currentAuthUserId?: string | null;
  inviteStatus?: "pending" | "confirmed";
}) {
  const isCurrentUser = !!currentAuthUserId && member.auth_user_id === currentAuthUserId;
  const hasLeadRole = member.role === "lead" || member.role === "admin";
  const effectiveStatus: "pending" | "confirmed" | null =
    hasLeadRole && inviteStatus ? inviteStatus : null;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committeeId, setCommitteeId] = useState(member.committee_id ?? "");
  const [isLead, setIsLead] = useState(hasLeadRole);
  const [showLeadEmailForm, setShowLeadEmailForm] = useState(false);
  const [leadEmail, setLeadEmail] = useState(member.email ?? "");

  async function handleSaveName() {
    if ((name || "").trim() === (member.full_name ?? "").trim()) {
      setEditing(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await updateMemberNameAction(orgSlug, member.id, name.trim());
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setEditing(false);
    window.location.reload();
  }

  async function handleCommitteeChange(newCommitteeId: string) {
    setCommitteeId(newCommitteeId);
    setError(null);
    const { error: err } = await updateMemberCommitteeAction(
      orgSlug,
      member.id,
      newCommitteeId || null
    );
    if (err) setError(err);
    else window.location.reload();
  }

  async function handleLeadChange(checked: boolean) {
    setError(null);
    if (checked) {
      setIsLead(true);
      setShowLeadEmailForm(true);
      setLeadEmail(member.email ?? "");
      return;
    }
    setShowLeadEmailForm(false);
    setIsLead(false);
    const { error: err } = await updateMemberRoleAction(orgSlug, member.id, "member");
    if (err) {
      setError(err);
      setIsLead(true);
    } else window.location.reload();
  }

  async function handleSubmitLeadWithEmail(e: React.FormEvent) {
    e.preventDefault();
    const email = leadEmail.trim();
    if (!email) {
      setError("E-Mail ist für Komiteeleitung erforderlich.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await setMemberAsLeadAction(orgSlug, member.id, email);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    window.location.reload();
  }

  async function handleDelete() {
    if (!window.confirm("Mitglied wirklich vollständig löschen?")) return;
    setLoading(true);
    setError(null);
    const { error } = await deleteMemberAction(orgSlug, member.id);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    window.location.reload();
  }

  async function handleResendInvite() {
    setLoading(true);
    setError(null);
    const { error } = await resendLeadInviteAction(orgSlug, member.id);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    window.alert("Einladungs-Link wurde erneut gesendet.");
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-cyan-500/20 bg-card/50 p-3 text-sm">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {editing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-[120px] flex-1 rounded border border-cyan-500/30 bg-background px-2 py-1 text-cyan-100"
            autoFocus
          />
        ) : (
          <span className="min-w-[120px] font-medium text-cyan-100">
            {isCurrentUser ? "Du" : (member.full_name ?? "-")}
          </span>
        )}
        {effectiveStatus && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              effectiveStatus === "confirmed"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {effectiveStatus === "confirmed" ? "Angemeldet" : "Einladung ausstehend"}
          </span>
        )}
        <select
          value={committeeId}
          onChange={(e) => handleCommitteeChange(e.target.value)}
          className="rounded border border-cyan-500/30 bg-background px-2 py-1 text-cyan-100"
        >
          <option value="">– Kein Komitee –</option>
          {committees.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 text-cyan-300">
          <input
            type="checkbox"
            checked={isLead}
            onChange={(e) => handleLeadChange(e.target.checked)}
            className="rounded border-cyan-500/40"
          />
          <span className="text-xs">Lead / Komiteeleitung</span>
        </label>
        {showLeadEmailForm && (
          <form onSubmit={handleSubmitLeadWithEmail} className="flex flex-wrap items-center gap-2">
            <input
              type="email"
              required
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="E-Mail für Einladung"
              className="min-w-[180px] rounded border border-cyan-500/30 bg-background px-2 py-1 text-xs text-cyan-100"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "…" : "E-Mail eintragen & als Lead speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLeadEmailForm(false);
                setIsLead(false);
                setError(null);
              }}
              className="rounded border border-cyan-500/40 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10"
            >
              Abbrechen
            </button>
          </form>
        )}
      </div>
      <div className="flex items-center gap-1">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={loading}
              className="rounded bg-cyan-600 px-2 py-1 text-xs text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading ? "…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(member.full_name ?? "");
                setError(null);
              }}
              className="rounded border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
            >
              Abbrechen
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-cyan-500/40 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10"
            >
              Name bearbeiten
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="rounded border border-red-500/60 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            >
              Entfernen
            </button>
            {hasLeadRole && effectiveStatus === "pending" && (
              <button
                type="button"
                onClick={handleResendInvite}
                disabled={loading}
                className="rounded border border-cyan-500/60 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50"
              >
                Einladung erneut senden
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </li>
  );
}
