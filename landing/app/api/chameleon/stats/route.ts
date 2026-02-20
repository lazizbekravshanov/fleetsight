import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [carrierCount, clusterCount, highRiskCount, lastSync] = await Promise.all([
    prisma.fmcsaCarrier.count(),
    prisma.carrierCluster.count(),
    prisma.carrierRiskScore.count({ where: { compositeScore: { gte: 70 } } }),
    prisma.syncRun.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, status: true } }),
  ]);

  return Response.json({
    carrierCount,
    clusterCount,
    highRiskCount,
    lastSync: lastSync ? { date: lastSync.createdAt.toISOString(), status: lastSync.status } : null,
  });
}
