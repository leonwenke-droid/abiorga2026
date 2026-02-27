import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrganization, isOrgAdmin } from "../../../../lib/getOrganization";
import AdminForbidden from "../AdminForbidden";
import { createSupabaseServiceRoleClient } from "../../../../lib/supabaseServer";
import CreateCommitteeForm from "./CreateCommitteeForm";
import CommitteeRow from "./CommitteeRow";

export default async function AdminCommitteesPage(props: {
  params: Promise<{ org: string }> | { org: string };
}) {
  const params = props.params;
  const orgSlug = typeof (params as Promise<{ org: string }>).then === "function"
    ? (await (params as Promise<{ org: string }>)).org
    : (params as { org: string }).org;
  const org = await getCurrentOrganization(orgSlug);
  if (!(await isOrgAdmin(org.id))) return <AdminForbidden orgSlug={orgSlug} orgName={org.name} />;

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServiceRoleClient()
    : createServerComponentClient({ cookies });
  const { data: committees } = await supabase
    .from("committees")
    .select("id, name")
    .eq("organization_id", org.id)
    .order("name");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href={`/${orgSlug}/admin`} className="text-sm text-cyan-400 hover:text-cyan-300">← Admin</Link>
      <h1 className="mt-4 text-2xl font-bold text-cyan-100">Komitees – {org.name}</h1>
      <p className="mt-1 text-sm text-cyan-300">Erstellen & Bearbeiten (Jahrgang)</p>

      <CreateCommitteeForm orgSlug={orgSlug} orgId={org.id} committees={committees ?? []} />

      <ul className="mt-6 space-y-2 rounded-lg border border-cyan-500/30 bg-card p-4">
        {(committees ?? []).map((c: { id: string; name: string }) => (
          <CommitteeRow key={c.id} orgSlug={orgSlug} committee={c} />
        ))}
        {(!committees || committees.length === 0) && (
          <li className="text-cyan-400/80">Noch keine Komitees.</li>
        )}
      </ul>
    </div>
  );
}
