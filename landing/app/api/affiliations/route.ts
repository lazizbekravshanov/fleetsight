import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ affiliations: [], total: 0 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const minScore = parseFloat(url.searchParams.get("minScore") ?? "0");
  const typeFilter = url.searchParams.get("type");
  const offset = (page - 1) * limit;

  const where = {
    affiliationScore: { gte: minScore || 0 },
    ...(typeFilter ? { affiliationType: typeFilter } : {}),
  };

  const [affiliations, total] = await Promise.all([
    prisma.carrierAffiliation.findMany({
      where,
      orderBy: { affiliationScore: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.carrierAffiliation.count({ where }),
  ]);

  // Enrich with carrier names
  const dotNumbers = new Set<number>();
  for (const a of affiliations) {
    dotNumbers.add(a.dotNumberA);
    dotNumbers.add(a.dotNumberB);
  }

  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: [...dotNumbers] } },
    select: { dotNumber: true, legalName: true, statusCode: true },
  });
  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));

  return Response.json({
    affiliations: affiliations.map((a) => ({
      id: a.id,
      carrierA: {
        dotNumber: a.dotNumberA,
        legalName: carrierMap.get(a.dotNumberA)?.legalName ?? null,
        statusCode: carrierMap.get(a.dotNumberA)?.statusCode ?? null,
      },
      carrierB: {
        dotNumber: a.dotNumberB,
        legalName: carrierMap.get(a.dotNumberB)?.legalName ?? null,
        statusCode: carrierMap.get(a.dotNumberB)?.statusCode ?? null,
      },
      sharedVinCount: a.sharedVinCount,
      affiliationScore: a.affiliationScore,
      affiliationType: a.affiliationType,
      flagged: a.flagged,
      firstDetectedAt: a.firstDetectedAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
