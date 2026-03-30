import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell user={{ email: session.user.email, name: session.user.name }}>
      {children}
    </AppShell>
  );
}
