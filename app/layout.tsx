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

export default async function RootLayout({ children }: { children: ReactNode }) {
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

