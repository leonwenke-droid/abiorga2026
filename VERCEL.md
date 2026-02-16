# Deployment auf Vercel

Damit der Build durchläuft und die App funktioniert, müssen in Vercel **Environment Variables** gesetzt werden:

1. Im Vercel-Dashboard: **Project → Settings → Environment Variables**
2. Folgende Variablen anlegen (Werte aus dem Supabase-Dashboard unter **Project Settings → API**):

| Name | Beschreibung |
|------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role Key (geheim halten) |

3. Für **Production**, **Preview** und **Development** aktivieren, damit sie beim Build und zur Laufzeit verfügbar sind.

Ohne diese Variablen schlägt der Build mit einem Fehler zu fehlenden Supabase-Credentials fehl.
