import { prisma } from "@/lib/prisma";
import { ChameleonDashboard } from "@/components/chameleon/chameleon-dashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const [carrierCount, clusterCount, highRiskCount, lastSync] = await Promise.all([
    prisma.fmcsaCarrier.count(),
    prisma.carrierCluster.count(),
    prisma.carrierRiskScore.count({ where: { compositeScore: { gte: 70 } } }),
    prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, status: true } }),
  ]);
  return {
    carrierCount,
    clusterCount,
    highRiskCount,
    lastSync: lastSync ? { date: lastSync.createdAt.toISOString(), status: lastSync.status } : null,
  };
}

export default async function ChameleonPage() {
  const stats = await getStats();

  return (
    <main className="min-h-screen bg-surface-0 text-slate-100">
      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />

      <div className="relative mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px]">
          <Link
            href="/"
            className="text-slate-500 transition-colors hover:text-slate-300"
          >
            FleetSight
          </Link>
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-slate-700">
            <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="text-slate-300">Chameleon Detection</span>
        </nav>

        {/* Header */}
        <header className="mb-8 mt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-blue-400">
                <path d="M10 2L3 6v8l7 4 7-4V6l-7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M10 10v8M3 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Chameleon Detection
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Identify reincarnated carriers through shared addresses, officers, VINs, and prior-revocation links
              </p>
            </div>
          </div>
        </header>

        <ChameleonDashboard initialStats={stats} />
      </div>
    </main>
  );
}
