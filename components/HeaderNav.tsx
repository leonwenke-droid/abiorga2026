"use client";

import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import FullPageLink from "./FullPageLink";
import LogoutButton from "./LogoutButton";

/**
 * Navigation: Dashboard und Admin-Board nur im Jahrgangskontext.
 * Logout nur anzeigen, wenn wirklich eingeloggt.
 */
export default function HeaderNav({ user }: { user: User | null }) {
  const pathname = usePathname() ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const reserved = ["admin", "dashboard", "login", "super-admin", "task", "api", "claim-org", "auth"];
  const orgSlug =
    segments.length >= 1 && !reserved.includes(segments[0]) ? segments[0] : null;

  const logoutReturnTo =
    pathname.startsWith("/super-admin")
      ? "/login?redirectTo=/super-admin"
      : orgSlug
        ? `/${orgSlug}/dashboard`
        : "/";

  return (
    <nav className="flex items-center gap-3 text-sm">
      {user && orgSlug && (
        <>
          <FullPageLink href={`/${orgSlug}/dashboard`}>Dashboard</FullPageLink>
          <FullPageLink href={`/${orgSlug}/admin`} className="text-cyan-400">
            Admin-Board
          </FullPageLink>
        </>
      )}
      {user && !pathname.startsWith("/auth") && !pathname.startsWith("/claim-org") && (
        <LogoutButton returnTo={logoutReturnTo} />
      )}
    </nav>
  );
}
