 "use client";

import { useState } from "react";

export default function AuthForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.message || "Login fehlgeschlagen. Bitte Zugangsdaten prüfen."
      );
      return;
    }

    window.location.href = redirectTo || "/admin";
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-sm">
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">
          E-Mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-cyan-400">
          Passwort
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
        />
      </div>
      {error && (
        <p className="text-xs text-red-300">
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary text-xs" disabled={loading}>
        {loading ? "Anmeldung..." : "Login"}
      </button>
    </form>
  );
}

