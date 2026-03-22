import { NextRequest } from "next/server";
import { jsonError } from "@/lib/http";
import { authenticateApiToken } from "@/lib/api-token";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const tokenRow = await authenticateApiToken(req.headers.get("authorization"));
  if (!tokenRow) {
    return jsonError("Invalid or expired API token", 401);
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [lastHour, last24h, last30d] = await Promise.all([
    prisma.apiKeyUsage.count({
      where: { tokenId: tokenRow.id, createdAt: { gte: hourAgo } },
    }),
    prisma.apiKeyUsage.count({
      where: { tokenId: tokenRow.id, createdAt: { gte: dayAgo } },
    }),
    prisma.apiKeyUsage.count({
      where: { tokenId: tokenRow.id, createdAt: { gte: monthAgo } },
    }),
  ]);

  // Get recent usage by endpoint
  const recentByEndpoint = await prisma.apiKeyUsage.groupBy({
    by: ["endpoint"],
    where: { tokenId: tokenRow.id, createdAt: { gte: dayAgo } },
    _count: true,
  });

  return Response.json({
    tokenId: tokenRow.id,
    tier: tokenRow.tier,
    usage: {
      lastHour,
      last24h,
      last30d,
    },
    byEndpoint: recentByEndpoint.map((e) => ({
      endpoint: e.endpoint,
      count: e._count,
    })),
  });
}
