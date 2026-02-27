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
  _label?: string
) {
  const org = await getCurrentOrganization(orgSlug);
  if (!(await isOrgAdmin(org.id))) {
    return { error: "Keine Berechtigung." };
  }
  if (!profileId || typeof points !== "number") {
    return { error: "Mitglied und Punkte angeben." };
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createSupabaseServiceRoleClient()
    : createServerComponentClient({ cookies });

  const { error } = await supabase.from("engagement_events").insert({
    user_id: profileId,
    event_type: "score_import",
    points,
    source_id: null
  });

  if (error) return { error: error.message };
  revalidatePath(`/${orgSlug}/admin`);
  revalidatePath(`/${orgSlug}/admin/scores/assign`);
  return { success: true };
}
