import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createSupabaseServiceRoleClient } from "../../../../lib/supabaseServer";
import OwnerSelectWithScope from "../../../../components/OwnerSelectWithScope";
import DueDateTimePicker from "../../../../components/DueDateTimePicker";
import SubmitButtonWithSpinner from "../../../../components/SubmitButtonWithSpinner";

export const dynamic = "force-dynamic";

async function createTask(formData: FormData) {
  "use server";

  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Nicht eingeloggt");
  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !["admin", "lead"].includes(profile.role)) {
    throw new Error("Nicht autorisiert");
  }

  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim() || null;
  const committeeId = formData.get("committee_id")?.toString() || null;
  const ownerId = formData.get("owner_id")?.toString() || null;
  const dueAt = formData.get("due_at")?.toString() || null;
  const proofRequired = formData.get("proof_required") === "on";

  if (!title) {
    throw new Error("Titel ist erforderlich");
  }

  if (dueAt && new Date(dueAt).getTime() < Date.now()) {
    throw new Error("Die Deadline darf nicht in der Vergangenheit liegen.");
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { error } = await service.from("tasks").insert({
    title,
    description,
    committee_id: committeeId || null,
    owner_id: ownerId || null,
    created_by: user.id,
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    proof_required: proofRequired,
    access_token: token
  });

  if (error) {
    console.error(error);
    throw new Error("Fehler beim Anlegen der Aufgabe");
  }

  redirect("/admin/tasks");
}

export default async function NewTaskPage() {
  const supabase = createServerComponentClient({ cookies });
  const service = createSupabaseServiceRoleClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return (
      <p className="text-sm text-amber-300">
        Session nicht erkannt. Bitte <a href="/login" className="underline">erneut einloggen</a>.
      </p>
    );
  }

  const [
    { data: profile, error: profileError },
    { data: committees, error: committeesError },
    { data: members, error: membersError },
    { data: profileCommittees }
  ] = await Promise.all([
    service.from("profiles").select("id, role").eq("auth_user_id", userId).single(),
    service.from("committees").select("id, name").order("name"),
    service.from("profiles").select("id, full_name, committee_id").order("full_name"),
    service.from("profile_committees").select("user_id, committee_id")
  ]);

  const userIdToCommitteeIds = new Map<string, string[]>();
  for (const pc of profileCommittees ?? []) {
    const uid = String((pc as { user_id: string }).user_id);
    const cid = String((pc as { committee_id: string }).committee_id);
    if (!userIdToCommitteeIds.has(uid)) userIdToCommitteeIds.set(uid, []);
    userIdToCommitteeIds.get(uid)!.push(cid);
  }

  if (!profile || !["admin", "lead"].includes(profile.role)) {
    return (
      <p className="text-sm text-red-300">
        Zugriff nur für Admins & Komiteeleitungen.
      </p>
    );
  }

  if (committeesError) {
    console.error("Komitees laden:", committeesError);
  }
  const committeeList = (committees ?? []).map((c) => ({
    id: String(c.id),
    name: String(c.name ?? "")
  }));

  return (
    <div className="card max-w-xl space-y-4">
      <h2 className="text-sm font-semibold text-cyan-400">
        Neue Aufgabe anlegen
      </h2>
      <form action={createTask} className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-cyan-400">
            Titel
          </label>
          <input
            name="title"
            required
            className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-cyan-400">
            Beschreibung
          </label>
          <textarea
            name="description"
            rows={3}
            className="w-full rounded border border-cyan-500/30 bg-card/60 p-2 text-xs"
          />
        </div>
        {committeeList.length === 0 && (
          <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Keine Komitees in der Datenbank. Bitte in Supabase unter Tabelle{" "}
            <strong>committees</strong> Einträge anlegen oder die Seed-Migration{" "}
            <code className="text-[10px]">20260210110000_seed_committees.sql</code> ausführen.
          </p>
        )}
        <OwnerSelectWithScope
          committees={committeeList}
          members={(members ?? []).map((m) => ({
            id: String(m.id),
            full_name: String(m.full_name ?? ""),
            committee_id: m.committee_id != null ? String(m.committee_id) : null,
            committee_ids: userIdToCommitteeIds.get(String(m.id)) ?? []
          }))}
          committeeName="Komitee"
          ownerName="Verantwortliche Person"
        />
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-cyan-400">
              Deadline
            </label>
            <DueDateTimePicker name="due_at" />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-xs text-cyan-100/80">
              <input
                type="checkbox"
                name="proof_required"
                defaultChecked
                className="rounded border-cyan-500/40 bg-card/60"
              />
              Beleg verpflichtend
            </label>
          </div>
        </div>
        <div className="pt-2">
          <SubmitButtonWithSpinner
            className="btn-primary text-xs inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            loadingLabel="Speichern…"
          >
            Aufgabe speichern
          </SubmitButtonWithSpinner>
        </div>
      </form>
    </div>
  );
}
