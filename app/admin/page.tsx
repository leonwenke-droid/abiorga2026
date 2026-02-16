import FullPageLink from "../../components/FullPageLink";

export default function AdminHome() {
  return (
    <div className="max-w-3xl mx-auto">
      <section className="rounded-2xl border border-cyan-500/25 bg-card/60 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-b from-cyan-500/10 to-transparent px-6 py-5 border-b border-cyan-500/20">
          <h1 className="text-lg font-bold text-cyan-300 tracking-tight">
            Admin-Board
          </h1>
          <p className="mt-1 text-xs text-cyan-400/80">
            Zentrale Steuerung für Aufgaben, Schichten, Engagement und Finanzen.
          </p>
        </div>
        <div className="p-6 grid gap-4 sm:grid-cols-3">
          <FullPageLink
            href="/admin/tasks"
            className="group flex flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-card/40 py-8 px-4 text-center transition hover:border-cyan-400/50 hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <span className="text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">
              Aufgaben & Kanban
            </span>
          </FullPageLink>
          <FullPageLink
            href="/admin/shifts"
            className="group flex flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-card/40 py-8 px-4 text-center transition hover:border-cyan-400/50 hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <span className="text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">
              Schichten & Auto-Zuteilung
            </span>
          </FullPageLink>
          <FullPageLink
            href="/admin/treasury"
            className="group flex flex-col items-center justify-center rounded-xl border border-cyan-500/30 bg-card/40 py-8 px-4 text-center transition hover:border-cyan-400/50 hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          >
            <span className="text-sm font-semibold text-cyan-200 group-hover:text-cyan-100">
              Kasse (Excel-Upload)
            </span>
          </FullPageLink>
        </div>
      </section>
    </div>
  );
}

