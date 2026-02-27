import Link from "next/link";
import { getAllOrganizations } from "../lib/getOrganization";
import { Mail, Phone, MapPin, Calendar } from "lucide-react";

export default async function LandingPage() {
  const organizations = await getAllOrganizations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-950 to-cyan-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            AbiOrga
          </h1>
          <div className="flex gap-3 text-sm">
            <Link
              href="#organizations"
              className="px-3 py-1.5 text-white/90 hover:text-cyan-300 transition-colors"
            >
              Jahrgänge
            </Link>
            <Link
              href="#contact"
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-sm font-semibold text-black shadow-glow hover:bg-cyan-400 transition-colors"
            >
              Schule anmelden
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Organisation leicht gemacht
        </h2>
        <p className="text-base md:text-lg text-cyan-100/90 mb-8 max-w-2xl mx-auto">
          Die smarte Plattform für deinen Abiturjahrgang: Aufgaben, Schichten,
          Kasse & Engagement‑Score an einem Ort.
        </p>
        <div className="flex flex-wrap gap-3 justify-center text-xs md:text-sm text-cyan-100/90">
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
            ✓ Automatische Schichtzuteilung
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
            ✓ Aufgaben‑Management mit Token‑Links
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
            ✓ Kassenverwaltung (Excel‑Import)
          </span>
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15">
            ✓ Engagement‑Tracking für faire Verteilung
          </span>
        </div>
      </section>

      {/* Organizations */}
      <section id="organizations" className="mx-auto max-w-7xl px-6 pb-16">
        <h3 className="text-xl md:text-2xl font-semibold text-white text-center mb-8">
          Aktive Schulen & Jahrgänge
        </h3>
        {organizations.length === 0 ? (
          <p className="text-center text-cyan-200/80 text-sm">
            Noch keine weiteren Organisationen – dein Jahrgang ist der erste 🚀
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Link
                key={org.id}
                href={`/${org.slug}/dashboard`}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors backdrop-blur-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">
                      {org.school_short || org.school_name}
                    </h4>
                    <p className="text-cyan-200 text-xs mt-0.5">
                      Abitur {org.year}
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-cyan-500 text-[10px] font-semibold text-black">
                    Aktiv
                  </span>
                </div>
                <p className="text-cyan-100/90 text-xs mt-1">
                  {org.school_name}
                </p>
                {org.school_city && (
                  <p className="flex items-center gap-1 text-[11px] text-cyan-200/90 mt-1">
                    <MapPin className="w-3 h-3" />
                    {org.school_city}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="mx-auto max-w-4xl px-6 pb-16 text-sm text-cyan-100/90"
      >
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm space-y-6">
          <h3 className="text-xl md:text-2xl font-semibold text-white text-center">
            Kontakt & Onboarding
          </h3>
          <p className="text-center text-cyan-100/90 max-w-xl mx-auto">
            Du möchtest AbiOrga für deinen Jahrgang nutzen? Schreib mir kurz,
            und wir richten innerhalb weniger Tage eure eigene Instanz ein.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-1">E-Mail</p>
                <a
                  href="mailto:kontakt@abiorga.app"
                  className="text-cyan-200 hover:text-cyan-100 transition-colors"
                >
                  kontakt@abiorga.app
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-1">Telefon</p>
                <a
                  href="tel:+491234567890"
                  className="text-cyan-200 hover:text-cyan-100 transition-colors"
                >
                  +49 123 456 7890
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] text-cyan-200/80">
            <Calendar className="w-3 h-3" />
            <span>Onboarding in der Regel innerhalb von 3–5 Werktagen</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-[11px] text-cyan-200/70">
          © {new Date().getFullYear()} AbiOrga. Alle Rechte vorbehalten.
        </div>
      </footer>
    </div>
  );
}

