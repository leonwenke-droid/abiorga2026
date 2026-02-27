"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import HeaderNav from "./HeaderNav";

const RESERVED = ["admin", "dashboard", "login", "super-admin", "task", "api", "claim-org", "auth"];

function useOrgSlug(): string | null {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length >= 1 && !RESERVED.includes(segments[0])) return segments[0];
  return null;
}

export default function AppHeader({ user }: { user: User | null }) {
  const pathname = usePathname() ?? "";
  const orgSlug = useOrgSlug();
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug) {
      setOrgName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/org-name?slug=${encodeURIComponent(orgSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.name) setOrgName(data.name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [orgSlug]);

  // Header auf Auth-/Onboarding-Routen ausblenden
  if (pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/claim-org")) return null;

  return (
    <header className="mb-6 flex items-center justify-between" role="banner">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-cyan-100">
          {orgName ? `ABI ORGA – ${orgName}` : "ABI ORGA"}
        </h1>
        <p className="text-xs text-cyan-400/80">
          Aufgaben, Schichten & Finanzen.
        </p>
      </div>
      <HeaderNav user={user} />
    </header>
  );
}
