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

async function getTopCarriers() {
  const carriers = await prisma.fmcsaCarrier.findMany({
    include: {
      riskScore: { select: { compositeScore: true, chameleonScore: true, clusterSize: true } },
    },
    orderBy: { riskScore: { compositeScore: "desc" } },
    take: 20,
  });
  return carriers.map((c) => ({
    dotNumber: c.dotNumber,
    legalName: c.legalName,
    dbaName: c.dbaName,
    statusCode: c.statusCode,
    compositeScore: c.riskScore?.compositeScore ?? 0,
    chameleonScore: c.riskScore?.chameleonScore ?? 0,
    clusterSize: c.riskScore?.clusterSize ?? 0,
  }));
}

export default async function ChameleonPage() {
  const [stats, topCarriers] = await Promise.all([getStats(), getTopCarriers()]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              Home
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-200">Chameleon Detection</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            Chameleon Carrier Detection
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Detect reincarnated carriers using FMCSA data — shared addresses,
            phones, officers, VINs, and prior-revocation links.
          </p>
        </header>

        <ChameleonDashboard initialStats={stats} initialCarriers={topCarriers} />
      </div>
    </main>
  );
}
