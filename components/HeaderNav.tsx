"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import FullPageLink from "./FullPageLink";
import LogoutButton from "./LogoutButton";
import { LayoutDashboard, Settings2 } from "lucide-react";

/**
 * Navigation: Dashboard und Admin-Board nur im Jahrgangskontext.
 * orgSlug aus Pfad (z.B. /abi-2026-tgg/dashboard) oder aus ?org= (z.B. /admin/tasks?org=abi-2026-tgg).
 */
export default function HeaderNav({ user }: { user: User | null }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const segments = pathname.split("/").filter(Boolean);
  const reserved = ["admin", "dashboard", "login", "super-admin", "task", "api", "claim-org", "auth"];
  const orgFromPath = segments.length >= 1 && !reserved.includes(segments[0]) ? segments[0] : null;
  const orgFromQuery = searchParams?.get("org")?.trim() || null;
  const orgSlug = orgFromPath || orgFromQuery;

  const logoutReturnTo =
    pathname.startsWith("/super-admin")
      ? "/login?redirectTo=/super-admin"
      : orgSlug
        ? `/${orgSlug}/dashboard`
        : "/";

  return (
    <nav className="flex items-center gap-2">
      {user && orgSlug && (
        <div className="flex items-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-1 py-0.5">
          <FullPageLink
            href={`/${orgSlug}/dashboard`}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/15 hover:text-cyan-100"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </FullPageLink>
          <FullPageLink
            href={`/${orgSlug}/admin`}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/15 hover:text-cyan-100"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
            Admin-Board
          </FullPageLink>
        </div>
      )}
      {user && !pathname.startsWith("/auth") && !pathname.startsWith("/claim-org") && (
        <LogoutButton returnTo={logoutReturnTo} />
      )}
    </nav>
  );
}
