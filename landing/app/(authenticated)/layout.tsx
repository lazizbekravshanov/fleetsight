import { getServerAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  return (
    <AppShell user={{ email: session?.user?.email ?? null, name: session?.user?.name ?? null }}>
      {children}
    </AppShell>
  );
}
