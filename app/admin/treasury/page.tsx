import { cookies } from "next/headers";
import Link from "next/link";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import TreasuryUploadForm from "../../../components/TreasuryUploadForm";
import { createSupabaseServiceRoleClient } from "../../../lib/supabaseServer";
import { getCurrentOrganization, isOrgAdmin } from "../../../lib/getOrganization";

export const dynamic = "force-dynamic";

type TreasuryPageProps = { searchParams?: Promise<{ org?: string }> | { org?: string } };

export default async function TreasuryPage(props: TreasuryPageProps) {
  const raw = props.searchParams;
  const searchParams = raw && typeof (raw as Promise<unknown>).then === "function"
    ? await (raw as Promise<{ org?: string }>)
    : (raw ?? {}) as { org?: string };
  const orgSlug = searchParams?.org?.trim() || null;

  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    const loginHref = orgSlug ? `/${orgSlug}/login` : "/";
    return (
      <p className="text-sm text-amber-300">
        Session nicht erkannt. Bitte <a href={loginHref} className="underline">erneut einloggen</a>.
      </p>
    );
  }

  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, role, organization_id")
    .eq("auth_user_id", userId)
    .single();

  if (!profile || !["admin", "lead", "super_admin"].includes(profile.role)) {
    return (
      <p className="text-sm text-red-300">
        Zugriff nur für Admins & Komiteeleitungen.
      </p>
    );
  }

  let orgId: string | null = null;
  if (orgSlug) {
    try {
      const org = await getCurrentOrganization(orgSlug);
      if (await isOrgAdmin(org.id)) orgId = org.id;
    } catch {
      orgId = null;
    }
  }
  if (!orgId && profile.organization_id) orgId = profile.organization_id;

  let treasuryQuery = service
    .from("treasury_updates")
    .select("amount, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (orgId) treasuryQuery = treasuryQuery.eq("organization_id", orgId);
  const { data: lastUpdate } = await treasuryQuery.maybeSingle();

  const defaultCellRef = process.env.TREASURY_EXCEL_CELL ?? "M9";

  return (
    <div className="space-y-4">
      {orgSlug && (
        <Link href={`/${orgSlug}/admin`} className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Admin (Jahrgang)
        </Link>
      )}
      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-cyan-400">
          Kassenstand
        </h2>
        <p className="text-xs text-cyan-400/80">
          Du kannst den Kassenstand entweder{" "}
          <span className="font-semibold">manuell eingeben</span> oder per{" "}
          <span className="font-semibold">Excel (.xlsx)</span> aktualisieren. Standardmäßig wird bei Excel die Zelle{" "}
          <code className="rounded bg-cyan-500/10 px-1">
            {defaultCellRef}
          </code>{" "}
          als Kassenstand verwendet – das kannst du im Formular anpassen.
        </p>
        {lastUpdate && (
          <p className="text-xs text-cyan-400/70">
            Letzter Stand:{" "}
            <span className="font-semibold">
              {Number(lastUpdate.amount).toLocaleString("de-DE")} €
            </span>{" "}
            ({new Date(lastUpdate.created_at).toLocaleString("de-DE")})
          </p>
        )}
      </section>

      <section className="card">
        <TreasuryUploadForm organizationId={orgId ?? undefined} defaultCellRef={defaultCellRef} />
      </section>
    </div>
  );
}
