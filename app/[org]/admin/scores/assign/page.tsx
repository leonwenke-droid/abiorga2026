import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrganization, isOrgAdmin } from "../../../../../lib/getOrganization";
import { createSupabaseServiceRoleClient } from "../../../../../lib/supabaseServer";
import AdminForbidden from "../../AdminForbidden";
import AssignPointsForm from "./AssignPointsForm";

export default async function AssignPointsPage({
  params
}: {
  params: Promise<{ org: string }> | { org: string };
}) {
  const orgSlug = typeof (params as Promise<{ org: string }>).then === "function"
    ? (await (params as Promise<{ org: string }>)).org
    : (params as { org: string }).org;
  const org = await getCurrentOrganization(orgSlug);

  if (!(await isOrgAdmin(org.id))) {
    return <AdminForbidden orgSlug={orgSlug} orgName={org.name} />;
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServiceRoleClient()
    : createServerComponentClient({ cookies });

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("organization_id", org.id)
    .order("full_name");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/${orgSlug}/admin`}
          className="text-sm text-cyan-400 hover:text-cyan-300"
        >
          ← Admin
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-cyan-100">
        Individuell Punkte vergeben
      </h1>
      <p className="mt-1 text-sm text-cyan-300">
        Events oder Ressourcen-Punkte für Mitglieder deines Jahrgangs eintragen (z. B. Veranstaltung, Material).
      </p>
      <AssignPointsForm
        orgSlug={orgSlug}
        members={(members ?? []).map((m) => ({ id: m.id, full_name: m.full_name ?? "-" }))}
      />
    </div>
  );
}
