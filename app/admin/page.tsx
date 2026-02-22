import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { createSupabaseServiceRoleClient } from "../../lib/supabaseServer";
import FullPageLink from "../../components/FullPageLink";
import LeadWeeklyBonusButton from "../../components/LeadWeeklyBonusButton";

async function runLeadWeeklyBonus(
  _prev: { message?: string } | null,
  _formData?: FormData
): Promise<{ message: string }> {
  "use server";
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return { message: "Nicht angemeldet." };

  const service = createSupabaseServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { message: "Nur Admins dürfen den Lead-Bonus ausführen." };
  }

  const { data: count, error } = await service.rpc("grant_lead_weekly_bonus");

  if (error) return { message: error.message };
  const n = typeof count === "number" ? count : 0;
  return { message: n > 0 ? `${n} Lead(s) haben +5 Punkte erhalten.` : "Alle Leads haben diese Woche bereits einen Bonus." };
}

export default async function AdminHome() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  const service = createSupabaseServiceRoleClient();
  const { data: profile } = user?.id
    ? await service.from("profiles").select("role").eq("auth_user_id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin";

  const navCards = [
    {
      href: "/admin/tasks",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      title: "Aufgaben & Kanban",
      desc: "Tasks verwalten, zuweisen und Status tracken"
    },
    {
      href: "/admin/shifts",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Schichten",
      desc: "Planung, Auto-Zuteilung & Ersatz"
    },
    {
      href: "/admin/treasury",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Kasse",
      desc: "Stand erfassen · Excel-Upload"
    },
    {
      href: "/admin/materials",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      title: "Event- & Ressourcenmanagement",
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-cyan-200 tracking-tight">
          Admin-Board
        </h1>
        <p className="text-sm text-cyan-400/90">
          Zentrale Steuerung für Aufgaben, Schichten, Finanzen, Event- & Ressourcenmanagement
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-500/80">
          Bereiche
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {navCards.map((card) => (
            <FullPageLink
              key={card.href}
              href={card.href}
              className="group flex gap-4 rounded-xl border border-cyan-500/25 bg-card/50 px-5 py-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            >
              <div className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center bg-cyan-500/15 text-cyan-400 group-hover:bg-cyan-500/25 group-hover:text-cyan-300 transition">
                {card.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-semibold text-cyan-200 group-hover:text-cyan-100">
                  {card.title}
                </span>
                <span className="block mt-0.5 text-xs text-cyan-400/80">
                  {card.desc}
                </span>
              </div>
              <span className="shrink-0 self-center text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition">
                →
              </span>
            </FullPageLink>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="rounded-xl border border-cyan-500/20 bg-card/40 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-cyan-300">
              Lead-Wochenbonus
            </h2>
            <p className="mt-1 text-xs text-cyan-400/90 leading-relaxed">
              Alle Leads erhalten wöchentlich +5 Engagement-Punkte. Läuft automatisch montags 06:00 UTC – oder manuell auslösen:
            </p>
          </div>
          <LeadWeeklyBonusButton action={runLeadWeeklyBonus} />
        </section>
      )}
    </div>
  );
}

