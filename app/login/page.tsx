import AuthForm from "../../components/AuthForm";

export default function LoginPage({
  searchParams
}: {
  searchParams?: { redirectTo?: string };
}) {
  const redirectTo = searchParams?.redirectTo || "/admin";

  return (
    <div className="mx-auto max-w-sm">
      <div className="card space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-cyan-400">
            Admin-Login
          </h2>
          <p className="mt-1 text-xs text-cyan-400/80">
            Zugriff auf das Admin-Board ist nur mit Benutzername und Passwort
            möglich.
          </p>
        </div>
        <AuthForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}

