import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/auth";
import { CarrierSnapshot } from "@/components/carrier-snapshot";
import { OpenClawConnectCard } from "@/components/openclaw-connect-card";
import { SignOutButton } from "@/components/signout-button";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });

  if (!user?.profile) {
    redirect("/onboarding");
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <CommandPalette />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              FleetSight
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900 sm:text-3xl">
              {greeting}, {user.profile.companyName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              <span>{user.email}</span>
              <span className="hidden sm:inline text-gray-300">|</span>
              <span>USDOT {user.profile.usdotNumber}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="hidden rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-400 shadow-sm sm:inline-block">
              Cmd+K
            </kbd>
            <SignOutButton />
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          <CarrierSnapshot usdotNumber={user.profile.usdotNumber} />
          <OpenClawConnectCard />
        </div>

        {/* Quick Actions */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Link
            href="/"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7" cy="7" r="5" />
                  <path d="M14 14l-3.5-3.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Carrier Lookup
                </h3>
                <p className="text-xs text-gray-500">
                  Search by USDOT or name
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition group-hover:bg-amber-100">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 1l1.8 5.5H15l-4.2 3 1.6 5.5L8 12l-4.4 3 1.6-5.5-4.2-3h5.2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Chameleon Detection
                </h3>
                <p className="text-xs text-gray-500">
                  Find reincarnated carriers
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
