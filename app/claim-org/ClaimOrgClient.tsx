"use client";

import { useState } from "react";
import AuthForm from "../../components/AuthForm";

type Org = { id: string; name: string; slug: string };
type User = { id: string; email?: string } | null;

export default function ClaimOrgClient({
  org,
  token,
  user
}: {
  org: Org;
  token: string;
  user: User;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const claimUrl = `/claim-org?token=${encodeURIComponent(token)}`;

  if (user) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-cyan-300">
          Du bist angemeldet. Klicke auf „Als Admin übernehmen“, dann geht es weiter mit Komitees, Personen und Leads.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/claim-org", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token })
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                setError(data.message || "Übernahme fehlgeschlagen.");
                setLoading(false);
                return;
              }
              const slug = data.orgSlug != null ? String(data.orgSlug).trim() : "";
              window.location.href = slug ? `/${encodeURIComponent(slug)}/onboarding` : "/";
            } catch {
              setError("Netzwerkfehler.");
              setLoading(false);
            }
          }}
        >
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            {loading ? "Wird übernommen…" : "Als Admin übernehmen"}
          </button>
        </form>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Hauptoption: Neuen Account anlegen */}
      <div className="rounded-lg border border-cyan-500/30 bg-card p-4">
        <h2 className="text-sm font-semibold text-cyan-100">Account anlegen</h2>
        <p className="mt-1 text-xs text-cyan-400/80">
          Name, E-Mail und Passwort angeben, Account anlegen. Danach auf „Als Admin übernehmen“ klicken.
        </p>
        <RegisterForm redirectTo={claimUrl} claimToken={token} />
      </div>

      {/* Klein unten: Bereits Account → Login-Bereich aufklappbar */}
      <div className="border-t border-cyan-500/20 pt-4">
        <button
          type="button"
          onClick={() => setShowLogin((v) => !v)}
          className="text-xs text-cyan-400 hover:text-cyan-300 underline"
        >
          {showLogin ? "Anmeldung ausblenden" : "Bereits einen Account? Hier anmelden"}
        </button>
        {showLogin && (
          <div className="mt-3 rounded-lg border border-cyan-500/20 bg-card/50 p-4">
            <h3 className="text-xs font-semibold text-cyan-200">Anmelden</h3>
            <div className="mt-3">
              <AuthForm redirectTo={claimUrl} />
            </div>
            <p className="mt-3 text-[11px] text-cyan-500">
              Noch kein Account? Bitte oben registrieren.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterForm({ redirectTo, claimToken }: { redirectTo: string; claimToken?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName, claimToken: claimToken || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Registrierung fehlgeschlagen.");
        setLoading(false);
        return;
      }
      window.location.href = `/claim-org/check-email?next=${encodeURIComponent(redirectTo)}`;
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
    }
  };

  return (
    <form className="mt-3 space-y-3 text-sm" onSubmit={onSubmit}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-cyan-400">Vorname</label>
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
            placeholder="z. B. Leon"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-cyan-400">Nachname</label>
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
            placeholder="z. B. Wenke"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">E-Mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">Passwort</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs text-cyan-100"
        />
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <button type="submit" className="rounded bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-700" disabled={loading}>
        {loading ? "Wird angelegt…" : "Account anlegen"}
      </button>
    </form>
  );
}
