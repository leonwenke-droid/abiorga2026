import Link from "next/link";
import { getCurrentOrganization, isOrgAdmin } from "../../../../../lib/getOrganization";
import AdminForbidden from "../../AdminForbidden";

export default async function AdminScoresExportPage({
  params
}: {
  params: Promise<{ org: string }> | { org: string };
}) {
  const orgSlug = typeof (params as Promise<{ org: string }>).then === "function"
    ? (await (params as Promise<{ org: string }>)).org
    : (params as { org: string }).org;
  const org = await getCurrentOrganization(orgSlug);
  if (!(await isOrgAdmin(org.id))) return <AdminForbidden orgSlug={orgSlug} orgName={org.name} />;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link href={`/${orgSlug}/admin`} className="text-sm text-cyan-400 hover:text-cyan-300">← Admin</Link>
      <h1 className="mt-4 text-2xl font-bold text-cyan-100">Engagement exportieren – {org.name}</h1>
      <p className="mt-1 text-sm text-cyan-300">Export für diesen Jahrgang (folgt).</p>
    </div>
  );
}
