import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrganization, isOrgAdmin } from "../../../lib/getOrganization";

/**
 * Onboarding für einen neuen Jahrgang: Befugte Person richtet ein –
 * Schüler importieren, Komitees anlegen, Admins festlegen.
 */
export default async function OnboardingPage(props: {
  params: Promise<{ org: string }> | { org: string };
}) {
  const params = props.params;
  const orgSlug = typeof (params as Promise<{ org: string }>).then === "function"
    ? (await (params as Promise<{ org: string }>)).org
    : (params as { org: string }).org;
  const org = await getCurrentOrganization(orgSlug);

  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${orgSlug}/login?redirectTo=/${encodeURIComponent(orgSlug)}/onboarding`);

  const canAccess = await isOrgAdmin(org.id);
  if (!canAccess) redirect(`/${orgSlug}/dashboard`);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-cyan-100">
        Jahrgang einrichten – {org.name}
      </h1>
      <p className="mt-1 text-sm text-cyan-300">
        Als berechtigte Person kannst du hier den Jahrgang einrichten: Schüler importieren, Komitees anlegen und Admins festlegen.
      </p>

      <ol className="mt-8 space-y-6 list-decimal list-inside text-sm text-cyan-200">
        <li>
          <strong className="text-cyan-100">Mitglieder / Schüler</strong>
          <p className="mt-1 text-cyan-400/80">
            Im Admin-Bereich kannst du Mitglieder verwalten und per Excel-Import hinzufügen. Vorlage herunterladen, ausfüllen (Name, optional Score, Komitees, Leitungen), dann hochladen.
          </p>
          <Link
            href={`/${orgSlug}/admin/members`}
            className="mt-2 inline-block text-cyan-400 hover:text-cyan-300 underline"
          >
            → Mitglieder &amp; Excel-Import
          </Link>
        </li>
        <li>
          <strong className="text-cyan-100">Komitees</strong>
          <p className="mt-1 text-cyan-400/80">
            Komitees für den Jahrgang anlegen und bearbeiten.
          </p>
          <Link
            href={`/${orgSlug}/admin/committees`}
            className="mt-2 inline-block text-cyan-400 hover:text-cyan-300 underline"
          >
            → Komitees
          </Link>
        </li>
        <li>
          <strong className="text-cyan-100">Admins festlegen</strong>
          <p className="mt-1 text-cyan-400/80">
            Im Mitglieder-Bereich können Admins die Rolle von Mitgliedern anpassen (Admin/Komiteeleitung für diesen Jahrgang).
          </p>
          <Link
            href={`/${orgSlug}/admin/members`}
            className="mt-2 inline-block text-cyan-400 hover:text-cyan-300 underline"
          >
            → Mitglieder &amp; Rollen
          </Link>
        </li>
        <li>
          <strong className="text-cyan-100">Alles verwalten</strong>
          <p className="mt-1 text-cyan-400/80">
            Aufgaben, Schichten, Material und Kasse – alles über das Admin-Dashboard deines Jahrgangs.
          </p>
          <Link
            href={`/${orgSlug}/admin`}
            className="mt-2 inline-block rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Admin-Dashboard öffnen
          </Link>
        </li>
      </ol>

      <p className="mt-8 text-xs text-cyan-400/70">
        Nach der Einrichtung können alle Admins und Mitglieder des Jahrgangs das Dashboard und die Admin-Funktionen wie gewohnt nutzen.
      </p>
    </div>
  );
}
