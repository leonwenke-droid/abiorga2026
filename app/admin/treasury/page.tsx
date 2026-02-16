import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import TreasuryUploadForm from "../../../components/TreasuryUploadForm";
import { createSupabaseServiceRoleClient } from "../../../lib/supabaseServer";

export default async function TreasuryPage() {
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

  const { data: lastUpdate } = await supabase
    .from("treasury_updates")
    .select("amount, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <section className="card space-y-2">
        <h2 className="text-sm font-semibold text-cyan-400">
          Kassenstand (Excel-Upload)
        </h2>
        <p className="text-xs text-cyan-400/80">
          Erwartetes Format: <strong>.xlsx</strong>, Zelle{" "}
          <code className="rounded bg-cyan-500/10 px-1">
            {process.env.TREASURY_EXCEL_CELL ?? "M9"}
          </code>{" "}
          enthält den aktuellen Kassenstand in Euro.
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
        <TreasuryUploadForm />
      </section>
    </div>
  );
}
