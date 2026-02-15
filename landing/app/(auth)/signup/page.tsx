import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { getServerAuthSession } from "@/auth";

export default async function SignupPage() {
  const session = await getServerAuthSession();
  if (session?.user?.id) {
    redirect("/onboarding");
  }

  return (
    <AuthShell
      title="Create your FleetSight account"
      subtitle="Get a secure customer login and onboard your company with FMCSA verification in one flow."
    >
      <SignupForm />
    </AuthShell>
  );
}
