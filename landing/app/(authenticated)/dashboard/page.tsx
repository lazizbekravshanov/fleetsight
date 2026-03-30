import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "@/auth";
import { CarrierSnapshot } from "@/components/carrier-snapshot";
import { OpenClawConnectCard } from "@/components/openclaw-connect-card";
import { WatchlistSection } from "@/components/dashboard/watchlist-section";
import { RecentSearchesSection } from "@/components/dashboard/recent-searches-section";
import { FleetHealthSection } from "@/components/dashboard/fleet-health-section";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner";
import { prisma } from "@/lib/prisma";
import { getCreditBalance } from "@/lib/credits";

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

  const [creditBalance, watchedCarriers, searchHistory] = await Promise.all([
    getCreditBalance(session.user.id),
    prisma.watchedCarrier.findMany({
      where: { userId: session.user.id },
      orderBy: { addedAt: "desc" },
    }),
    prisma.searchHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { searchedAt: "desc" },
      take: 15,
    }),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
            {greeting}, {user.profile.companyName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            <span>{user.email}</span>
            <span style={{ color: "var(--border-hover)" }}>|</span>
            <span>USDOT {user.profile.usdotNumber}</span>
            <span style={{ color: "var(--border-hover)" }}>|</span>
            <Link href="/credits" className="text-indigo-500 hover:text-indigo-400 transition-colors">
              {creditBalance} AI credits
            </Link>
          </div>
        </div>
      </div>

      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Fleet Health + Alerts Row */}
      <FleetHealthSection />
      <AlertsSection />

      {/* Watchlist + Recent side by side on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WatchlistSection initial={watchedCarriers} />
        <RecentSearchesSection history={searchHistory} />
      </div>

      {/* Carrier Snapshot + API Access */}
      <div className="grid gap-6 md:grid-cols-2">
        <CarrierSnapshot usdotNumber={user.profile.usdotNumber} />
        <OpenClawConnectCard />
      </div>
    </div>
  );
}
