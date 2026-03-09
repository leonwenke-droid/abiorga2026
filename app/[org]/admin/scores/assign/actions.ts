"use server";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentOrganization, isOrgAdmin } from "../../../../../lib/getOrganization";
import { createSupabaseServiceRoleClient } from "../../../../../lib/supabaseServer";

export async function assignPoints(
  orgSlug: string,
  profileId: string,
  points: number,
  reason: string
) {
  const org = await getCurrentOrganization(orgSlug);
  if (!(await isOrgAdmin(org.id))) {
    return { error: "Keine Berechtigung." };
  }
  if (!profileId || typeof points !== "number") {
    return { error: "Mitglied und Punkte angeben." };
  }
  const trimmedReason = String(reason ?? "").trim();
  if (!trimmedReason) {
    return { error: "Begründung ist erforderlich." };
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServiceRoleClient()
    : createServerComponentClient({ cookies });

  let createdBy: string | null = null;
  const authClient = createServerComponentClient({ cookies });
  const { data: { user } } = await authClient.auth.getUser();
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    createdBy = profile?.id ?? null;
  }

  const { error: eventErr } = await supabase.from("engagement_events").insert({
    user_id: profileId,
    event_type: "score_import",
    points,
    source_id: null
  });
  if (eventErr) return { error: eventErr.message };

  const { error: logErr } = await supabase.from("score_import_log").insert({
    organization_id: org.id,
    user_id: profileId,
    points,
    reason: trimmedReason,
    created_by: createdBy
  });
  if (logErr) return { error: logErr.message };

  revalidatePath(`/${orgSlug}/admin`);
  revalidatePath(`/${orgSlug}/admin/scores/assign`);
  return { success: true };
}
