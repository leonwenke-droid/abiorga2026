import "./globals.css";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AppHeader from "../components/AppHeader";

export const metadata = {
  title: "ABI ORGA 2026",
  description:
    "Zentrales Orga- und Engagement-Board für den Abijahrgang 2026."
};

function EnvErrorPage() {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-200">
          <h1 className="text-lg font-semibold mb-2">Konfiguration fehlt</h1>
          <p className="text-sm mb-4">
            Die Umgebungsvariablen <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> und{" "}
            <code className="bg-black/30 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sind nicht gesetzt.
          </p>
          <p className="text-xs text-amber-200/80">
            Lokal: Prüfe deine <code className="bg-black/30 px-1 rounded">.env</code> und starte den Dev-Server neu.
            Vercel: Füge die Variablen unter Project Settings → Environment Variables hinzu.
          </p>
        </div>
      </body>
    </html>
  );
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return <EnvErrorPage />;
  }

  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="de" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
          <AppHeader user={user} />
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

