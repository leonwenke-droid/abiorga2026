"use client";

import { useState } from "react";

/**
 * Nach Logout wird zu returnTo weitergeleitet.
 * - Aus Super-Admin: returnTo="/login?redirectTo=/super-admin"
 * - Aus Jahrgang (Admin/Dashboard): returnTo="/{orgSlug}/dashboard"
 * - Sonst: returnTo="/"
 */
export default function LogoutButton({ returnTo = "/" }: { returnTo?: string }) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      const target = returnTo?.trim() || "/";
      window.location.href = target.startsWith("/") ? target : `/${target}`;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="text-xs text-cyan-300 hover:text-cyan-100"
    >
      {loading ? "Abmelden..." : "Logout"}
    </button>
  );
}

