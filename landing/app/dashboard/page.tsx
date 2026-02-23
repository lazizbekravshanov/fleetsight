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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-600">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900">{user.profile.companyName}</h1>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
            <p className="text-sm text-gray-500">USDOT: {user.profile.usdotNumber}</p>
          </div>
          <SignOutButton />
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <CarrierSnapshot usdotNumber={user.profile.usdotNumber} />
          <OpenClawConnectCard />
          <Link
            href="/"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h3 className="text-lg font-semibold text-gray-900">Carrier Detection</h3>
            <p className="mt-2 text-sm text-gray-500">
              Detect reincarnated carriers using shared addresses, phones, officers,
              VINs, and prior-revocation links from FMCSA data.
            </p>
            <p className="mt-3 text-sm font-medium text-indigo-600 transition group-hover:text-indigo-500">
              Search carriers &rarr;
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
