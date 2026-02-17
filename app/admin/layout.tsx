import AdminBackLink from "../../components/AdminBackLink";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminBackLink />
      {children}
    </>
  );
}
