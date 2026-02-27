import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrganization, isOrgAdmin, getOrgIdForData } from "../../../../lib/getOrganization";
import AdminForbidden from "../AdminForbidden";
import { createSupabaseServiceRoleClient } from "../../../../lib/supabaseServer";
import MembersExcelUpload from "./MembersExcelUpload";
import AddMemberForm from "./AddMemberForm";
import MemberRow from "./MemberRow";

export default async function AdminMembersPage({
  params
}: {
  params: Promise<{ org: string }> | { org: string };
}) {
  const orgSlug = typeof (params as Promise<{ org: string }>).then === "function"
    ? (await (params as Promise<{ org: string }>)).org
    : (params as { org: string }).org;
  const org = await getCurrentOrganization(orgSlug);
  const orgIdForData = getOrgIdForData(orgSlug, org.id);
  if (!(await isOrgAdmin(orgIdForData))) return <AdminForbidden orgSlug={orgSlug} orgName={org.name} />;

  const authClient = createServerComponentClient({ cookies });
  const {
    data: { session }
  } = await authClient.auth.getSession();
  const currentAuthUserId = session?.user?.id ?? null;

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServiceRoleClient()
    : createServerComponentClient({ cookies });

  const { data: committees } = await supabase
    .from("committees")
    .select("id, name")
    .eq("organization_id", orgIdForData)
    .order("name");

  // Alle mit organization_id = orgIdForData; committee = primäres Komitee, role = Lead/Admin/Member, email/auth für Lead-Einladung
  const { data: orgMembers } = await supabase
    .from("profiles")
    .select("id, full_name, role, committee_id, email, auth_user_id, committee:committees!committee_id(name)")
    .eq("organization_id", orgIdForData)
    .order("full_name");

  const orgIds = new Set((orgMembers ?? []).map((m: { id: string }) => m.id));

  // Alle user_ids, die in engagement_scores für diese Org vorkommen
  const { data: scoresRows } = await supabase
    .from("engagement_scores")
    .select("user_id")
    .eq("organization_id", orgIdForData);

  const userIdsFromScores = [...new Set((scoresRows ?? []).map((r: { user_id: string }) => r.user_id))];
  const missingIds = userIdsFromScores.filter((id) => !orgIds.has(id));

  // Fehlende Profile nachladen und zur Liste hinzufügen
  let extraMembers: Array<{ id: string; full_name: string | null; committee: unknown }> = [];
  if (missingIds.length > 0) {
    const { data: extra } = await supabase
      .from("profiles")
      .select("id, full_name, role, committee_id, email, auth_user_id, committee:committees!committee_id(name)")
      .in("id", missingIds);
    extraMembers = (extra ?? []) as Array<{ id: string; full_name: string | null; role?: string; committee_id?: string | null; email?: string | null; auth_user_id?: string | null; committee: unknown }>;
  }

  const members = [...(orgMembers ?? []), ...extraMembers].sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "")
  );

  // Einladungsstatus bestimmen (nur wenn Service-Role verfügbar, damit wir Admin-API nutzen können)
  const inviteStatusByProfileId: Record<string, "pending" | "confirmed"> = {};
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && members.length > 0) {
    const authIds = members
      .map((m) => (m as { auth_user_id?: string | null }).auth_user_id)
      .filter((id): id is string => !!id);
    if (authIds.length > 0) {
      const adminClient = createSupabaseServiceRoleClient();
      const { data: listData } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      const byId = new Map(
        (listData?.users ?? [])
          .filter((u) => u.id && authIds.includes(u.id))
          .map((u) => [u.id as string, (u as { email_confirmed_at?: string | null }).email_confirmed_at ?? null])
      );
      for (const m of members as Array<{ id: string; auth_user_id?: string | null }>) {
        if (!m.auth_user_id) continue;
        const confirmedAt = byId.get(m.auth_user_id);
        inviteStatusByProfileId[m.id] = confirmedAt ? "confirmed" : "pending";
      }
    }
  }

  const committeeList = (committees ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link href={`/${orgSlug}/admin`} className="text-sm text-cyan-400 hover:text-cyan-300">← Admin</Link>
      <h1 className="mt-4 text-2xl font-bold text-cyan-100">Mitglieder – {org.name}</h1>
      <p className="mt-1 text-sm text-cyan-300">Verwalten & Importieren (Jahrgang)</p>

      <div className="mt-6 rounded-lg border border-cyan-500/30 bg-card p-4">
        <h2 className="text-sm font-semibold text-cyan-100">Excel-Import</h2>
        <p className="mt-1 text-xs text-cyan-400/80">
          Vorlage herunterladen, ausfüllen (Name, optional Score, Komitees, Leitungen), dann hier hochladen. Bereits vorhandene Namen werden übersprungen.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href="/api/members-template"
            download="Mitglieder-Vorlage.xlsx"
            className="text-sm text-cyan-400 hover:text-cyan-300 underline"
          >
            Vorlage herunterladen
          </a>
          <MembersExcelUpload orgSlug={orgSlug} />
        </div>
      </div>

      <div className="mt-6">
        <AddMemberForm orgSlug={orgSlug} committees={committeeList} />
      </div>

      <ul className="mt-6 space-y-2 rounded-lg border border-cyan-500/30 bg-card p-4">
        {(members ?? []).map((m: any) => (
          <MemberRow
            key={m.id}
            orgSlug={orgSlug}
            member={m}
            committees={committeeList}
            currentAuthUserId={currentAuthUserId}
            inviteStatus={inviteStatusByProfileId[m.id]}
          />
        ))}
        {(!members || members.length === 0) && (
          <li className="text-cyan-400/80">Noch keine Mitglieder.</li>
        )}
      </ul>
    </div>
  );
}
