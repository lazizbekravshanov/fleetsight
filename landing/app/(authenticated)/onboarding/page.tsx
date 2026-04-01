import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";
import { OnboardingForm } from "@/components/onboarding-form";
import { prisma } from "@/lib/prisma";

export default async function OnboardingPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const existing = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true }
  });

  if (existing) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-surface-0 text-ink">
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold">Complete customer setup</h1>
        <p className="mt-2 text-ink-soft">
          We validate your USDOT against FMCSA before unlocking the dashboard.
        </p>
        <OnboardingForm initialEmail={session.user.email} />
      </div>
    </main>
  );
}
