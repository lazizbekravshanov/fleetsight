import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/auth";
import { CarrierSnapshot } from "@/components/carrier-snapshot";
import { OpenClawConnectCard } from "@/components/openclaw-connect-card";
import { SignOutButton } from "@/components/signout-button";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true }
  });

  if (!user?.profile) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">{user.profile.companyName}</h1>
            <p className="mt-1 text-sm text-slate-300">{user.email}</p>
            <p className="text-sm text-slate-300">USDOT: {user.profile.usdotNumber}</p>
          </div>
          <SignOutButton />
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <CarrierSnapshot usdotNumber={user.profile.usdotNumber} />
          <OpenClawConnectCard />
          <Link
            href="/chameleon"
            className="group rounded-xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-blue-500/40 hover:bg-slate-900"
          >
            <h3 className="text-lg font-semibold text-white">Chameleon Detection</h3>
            <p className="mt-2 text-sm text-slate-400">
              Detect reincarnated carriers using shared addresses, phones, officers,
              VINs, and prior-revocation links from FMCSA data.
            </p>
            <p className="mt-3 text-sm font-medium text-blue-400 transition group-hover:text-blue-300">
              View dashboard &rarr;
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
