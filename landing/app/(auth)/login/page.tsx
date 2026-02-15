import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { getServerAuthSession } from "@/auth";

export default async function LoginPage() {
  const session = await getServerAuthSession();
  if (session?.user?.id) {
    redirect("/onboarding");
  }

  return (
    <AuthShell
      title="Sign in to FleetSight"
      subtitle="Access your customer dashboard, validate carriers by USDOT, and connect OpenClaw securely."
    >
      <LoginForm />
    </AuthShell>
  );
}
