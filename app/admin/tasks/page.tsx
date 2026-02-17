import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { createSupabaseServiceRoleClient } from "../../../lib/supabaseServer";
import CopyTaskLinkButton from "../../../components/CopyTaskLinkButton";
import SubmitButtonWithSpinner from "../../../components/SubmitButtonWithSpinner";
import CommitteeFilter from "../../../components/CommitteeFilter";

export const dynamic = "force-dynamic";

const STATUS_COLUMNS = [
  { key: "offen", label: "Offen" },
  { key: "in_arbeit", label: "In Arbeit" },
  { key: "erledigt", label: "Erledigt" }
] as const;

async function deleteTask(formData: FormData) {
  "use server";
  const taskId = formData.get("taskId")?.toString();
  if (!taskId) return;
  const service = createSupabaseServiceRoleClient();
  await service.from("tasks").delete().eq("id", taskId);
  revalidatePath("/admin/tasks");
}

type PageProps = { searchParams?: Promise<{ committee?: string }> | { committee?: string } };

export default async function AdminTasksPage(props: PageProps) {
  const raw = props.searchParams;
  const searchParams = raw && typeof (raw as Promise<unknown>).then === "function"
    ? await (raw as Promise<{ committee?: string }>)
    : (raw ?? {}) as { committee?: string };
  const committeeId = searchParams?.committee?.trim() || null;
  const supabase = createServerComponentClient({ cookies });
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

  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", userId)
    .single();

  if (!profile || !["admin", "lead"].includes(profile.role)) {
    return (
      <p className="text-sm text-red-300">
        Zugriff nur für Admins & Komiteeleitungen.
      </p>
    );
  }

  await service.rpc("apply_task_missed_penalties");

  const [{ data: committees }, { data: tasks }, { data: profiles }] = await Promise.all([
    service.from("committees").select("id, name").order("name"),
    service
      .from("tasks")
      .select(
        "id, title, description, status, due_at, committee_id, owner_id, created_by, proof_required, proof_url, access_token, committees ( name )"
      )
      .order("due_at", { ascending: true }),
    service.from("profiles").select("id, full_name")
  ]);

  const profileNames = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
  );

  const committeesForFilter = (committees ?? []).filter(
    (c: { name?: string | null }) => !/Jahrgangssprecher/i.test(String(c.name ?? ""))
  );

  const tasksFiltered = committeeId
    ? (tasks ?? []).filter((t: { committee_id?: string | null }) => t.committee_id === committeeId)
    : (tasks ?? []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-cyan-400">
            Aufgaben & Kanban
          </h2>
          <Suspense fallback={<span className="text-[10px] text-cyan-400/60">Komitee …</span>}>
            <CommitteeFilter committees={committeesForFilter} />
          </Suspense>
        </div>
        <Link href="/admin/tasks/new" className="btn-primary text-xs">
          Neue Aufgabe anlegen
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STATUS_COLUMNS.map((col) => (
          <div key={col.key} className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                {col.label}
              </h3>
              <span className="text-[10px] text-cyan-400/70">
                {tasksFiltered.filter((t) => t.status === col.key).length} Aufgaben
              </span>
            </div>
            <div className="space-y-2 text-xs">
              {tasksFiltered
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <article
                    key={t.id}
                    className="rounded-lg border border-cyan-500/20 bg-card/80 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-[11px] font-semibold">
                          {t.title}
                        </h4>
                        <p className="text-[10px] text-cyan-100/70">
                          Komitee: {(t.committees as { name?: string })?.name ?? "–"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[9px]">
                        {t.due_at && (
                          <span className="rounded bg-cyan-500/10 px-1 py-0.5 text-cyan-200">
                            {new Date(t.due_at).toLocaleDateString("de-DE")}
                          </span>
                        )}
                        <span className="text-cyan-400/70">
                          {t.proof_required
                            ? t.proof_url
                              ? "Beleg vorhanden"
                              : "Beleg fehlt"
                            : "Beleg optional"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1.5 space-y-0.5 text-[10px] text-cyan-100/80">
                      <p>
                        Ausgestellt von: {t.created_by ? profileNames.get(t.created_by) ?? "–" : "–"}
                      </p>
                      <p>
                        Zugewiesen an: {t.owner_id ? profileNames.get(t.owner_id) ?? "–" : "Unzugewiesen"}
                      </p>
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-[10px] text-cyan-100/60">
                        {t.description}
                      </p>
                    )}
                    {(t.proof_url || (t as { access_token?: string }).access_token) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px]">
                        {(t as { access_token?: string }).access_token && (
                          <CopyTaskLinkButton token={(t as { access_token: string }).access_token} />
                        )}
                        {t.proof_url && (
                          <a
                            href={t.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-300 hover:bg-cyan-500/30"
                          >
                            Beweis ansehen
                          </a>
                        )}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
                        {col.label}
                      </span>
                      <form action={deleteTask} className="inline">
                        <input type="hidden" name="taskId" value={t.id} />
                        <SubmitButtonWithSpinner
                          className="inline-flex items-center gap-1.5 rounded bg-red-500/20 px-2 py-0.5 text-[9px] text-red-300 hover:bg-red-500/30 disabled:opacity-70"
                          title="Aufgabe entfernen"
                          loadingLabel="…"
                        >
                          Entfernen
                        </SubmitButtonWithSpinner>
                      </form>
                    </div>
                  </article>
                ))}
              {!tasksFiltered.filter((t) => t.status === col.key).length && (
                <p className="text-[11px] text-cyan-400/60">
                  Keine Aufgaben in dieser Spalte.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
