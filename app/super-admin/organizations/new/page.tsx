import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "../../../../lib/getOrganization";
import Link from "next/link";
import { randomUUID } from "crypto";

export default async function NewOrganizationPage() {
  if (!(await isSuperAdmin())) {
    redirect("/");
  }

  async function createOrganization(formData: FormData) {
    "use server";

    const supabase = createServerComponentClient({ cookies });
    const setupToken = randomUUID();

    const name = (formData.get("name") as string)?.trim() ?? "";
    const slug = (formData.get("slug") as string)?.trim() ?? "";
    const subdomain = ((formData.get("subdomain") as string)?.trim() || null) as string | null;
    const schoolName = (formData.get("school_name") as string)?.trim() ?? "";
    const schoolShort = ((formData.get("school_short") as string)?.trim() || null) as string | null;
    const schoolCity = ((formData.get("school_city") as string)?.trim() || null) as string | null;
    const year = parseInt(formData.get("year") as string, 10);

    const insertPayload = {
      name,
      slug,
      subdomain: subdomain || null,
      school_name: schoolName,
      school_short: schoolShort || null,
      school_city: schoolCity || null,
      year,
      is_active: true,
      setup_token: setupToken
    };

    let result = await supabase
      .from("organizations")
      .insert(insertPayload)
      .select()
      .single();

    let org = result.data;
    let orgError = result.error;
    let usedTokenFallback = false;

    if (orgError?.code === "PGRST204") {
      usedTokenFallback = true;
      const { setup_token: _st, ...payloadWithoutToken } = insertPayload;
      result = await supabase
        .from("organizations")
        .insert(payloadWithoutToken)
        .select()
        .single();
      org = result.data;
      orgError = result.error;
    }

    if (orgError || !org) {
      console.error("Error creating org:", orgError);
      return;
    }

    const { data: templates } = await supabase
      .from("committees")
      .select("name")
      .eq("is_default", true);

    if (templates && templates.length > 0) {
      const committees = templates.map((t) => ({
        name: t.name,
        organization_id: org.id,
        is_default: false
      }));
      await supabase.from("committees").insert(committees);
    }

    if (usedTokenFallback) {
      redirect("/super-admin");
    }
    redirect(`/super-admin/org-created?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(setupToken)}`);
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-cyan-100">
          Neue Organisation erstellen
        </h1>
        <p className="text-sm text-cyan-300">
          Lege eine neue Schule + Jahrgang an. Dein aktueller Abi‑Jahrgang
          bleibt unverändert als eigene Organisation bestehen.
        </p>

        <form action={createOrganization} className="space-y-6">
          <div className="space-y-4 rounded-lg bg-card border border-cyan-500/30 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Voller Name *
              </label>
              <input
                type="text"
                name="name"
                placeholder="Abitur 2027 - Ulrichsgymnasium Norden"
                required
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                URL-Slug * (nur Kleinbuchstaben, Zahlen, -)
              </label>
              <input
                type="text"
                name="slug"
                placeholder="abi-2027-ueg"
                pattern="[a-z0-9-]+"
                required
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
              <p className="mt-1 text-xs text-cyan-400">
                URL: abiorga.app/<strong>abi-2027-ueg</strong>
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Subdomain (optional)
              </label>
              <input
                type="text"
                name="subdomain"
                placeholder="ueg-2027"
                pattern="[a-z0-9-]*"
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
              <p className="mt-1 text-xs text-cyan-400">
                Subdomain: <strong>ueg-2027</strong>.abiorga.app
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Schulname *
              </label>
              <input
                type="text"
                name="school_name"
                placeholder="Ulrichsgymnasium Norden"
                required
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Schulkürzel
              </label>
              <input
                type="text"
                name="school_short"
                placeholder="UEG"
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Stadt
              </label>
              <input
                type="text"
                name="school_city"
                placeholder="Norden"
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-cyan-300">
                Abiturjahr *
              </label>
              <input
                type="number"
                name="year"
                min="2024"
                max="2050"
                placeholder="2027"
                required
                className="w-full rounded border border-cyan-500/30 bg-background p-2.5 text-sm text-cyan-100"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
            >
              Organisation erstellen
            </button>
            <Link
              href="/super-admin"
              className="rounded-lg border border-cyan-500/40 bg-card px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

