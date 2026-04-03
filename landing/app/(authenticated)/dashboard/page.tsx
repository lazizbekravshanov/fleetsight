import Link from "next/link";
import { getServerAuthSession } from "@/auth";
import { CarrierSnapshot } from "@/components/carrier-snapshot";
import { OpenClawConnectCard } from "@/components/openclaw-connect-card";
import { WatchlistSection } from "@/components/dashboard/watchlist-section";
import { RecentSearchesSection } from "@/components/dashboard/recent-searches-section";
import { FleetHealthSection } from "@/components/dashboard/fleet-health-section";
import { AlertsSection } from "@/components/dashboard/alerts-section";
import { prisma } from "@/lib/prisma";
import type { WatchedCarrier, SearchHistory } from "@prisma/client";

export default async function DashboardPage() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  let profile = null;
  let watchedCarriers: WatchedCarrier[] = [];
  let searchHistory: SearchHistory[] = [];

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    profile = user?.profile ?? null;

    const [watched, history] = await Promise.all([
      prisma.watchedCarrier.findMany({
        where: { userId },
        orderBy: { addedAt: "desc" },
      }),
      prisma.searchHistory.findMany({
        where: { userId },
        orderBy: { searchedAt: "desc" },
        take: 15,
      }),
    ]);
    watchedCarriers = watched;
    searchHistory = history;
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--ink)" }}>
            {greeting}{profile ? `, ${profile.companyName}` : ""}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            {session?.user?.email && <span>{session.user.email}</span>}
            {profile && (
              <>
                <span style={{ color: "var(--border-hover)" }}>|</span>
                <span>USDOT {profile.usdotNumber}</span>
              </>
            )}
            <span style={{ color: "var(--border-hover)" }}>|</span>
            <span className="text-accent">All features free</span>
          </div>
        </div>
      </div>

      {/* Fleet Health + Alerts Row */}
      <FleetHealthSection />
      <AlertsSection />

      {/* Watchlist + Recent side by side on large screens */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WatchlistSection initial={watchedCarriers} />
        <RecentSearchesSection history={searchHistory} />
      </div>

      {/* Carrier Snapshot + API Access */}
      {profile && (
        <div className="grid gap-6 md:grid-cols-2">
          <CarrierSnapshot usdotNumber={profile.usdotNumber} />
          <OpenClawConnectCard />
        </div>
      )}
    </div>
  );
}
