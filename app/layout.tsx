import "./globals.css";
import type { ReactNode } from "react";
import LogoutButton from "../components/LogoutButton";
import FullPageLink from "../components/FullPageLink";

export const metadata = {
  title: "ABI ORGA 2026",
  description:
    "Zentrales Orga- und Engagement-Board für den Abijahrgang 2026."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                ABI ORGA 2026
              </h1>
              <p className="text-xs text-cyan-400/80">
                Aufgaben, Schichten & Finanzen.
              </p>
            </div>
            <nav className="flex items-center gap-3 text-sm">
              <FullPageLink href="/dashboard">Dashboard</FullPageLink>
              <FullPageLink href="/admin" className="text-cyan-400">
                Admin-Board
              </FullPageLink>
              <LogoutButton />
            </nav>
          </header>
          <main className="flex-1 pb-10">{children}</main>
          <footer className="mt-8 border-t border-cyan-500/20 pt-4 text-xs text-cyan-400/60">
            <a
              href="https://lyniqmedia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-400/90 transition-colors"
            >
              powered by LYNIQ Media
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}

