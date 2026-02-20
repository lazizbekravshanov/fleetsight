import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

const querySchema = z.object({
  q: z.string().min(1).max(200),
  sort: z.enum(["risk", "name", "dot"]).default("risk"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid search parameters", 400);
  }

  const { q, sort, limit, offset } = parsed.data;
  const isNumeric = /^\d+$/.test(q.trim());

  const where = isNumeric
    ? { dotNumber: parseInt(q.trim(), 10) }
    : {
        OR: [
          { legalName: { contains: q, mode: "insensitive" as const } },
          { dbaName: { contains: q, mode: "insensitive" as const } },
        ],
      };

  const orderBy =
    sort === "name"
      ? { legalName: "asc" as const }
      : sort === "dot"
        ? { dotNumber: "asc" as const }
        : undefined;

  const carriers = await prisma.fmcsaCarrier.findMany({
    where,
    include: {
      riskScore: { select: { compositeScore: true, chameleonScore: true, clusterSize: true } },
    },
    take: limit,
    skip: offset,
    ...(orderBy ? { orderBy } : {}),
  });

  // If sorting by risk, we need to sort in memory since riskScore is a relation
  let results = carriers.map((c) => ({
    dotNumber: c.dotNumber,
    legalName: c.legalName,
    dbaName: c.dbaName,
    statusCode: c.statusCode,
    compositeScore: c.riskScore?.compositeScore ?? 0,
    chameleonScore: c.riskScore?.chameleonScore ?? 0,
    clusterSize: c.riskScore?.clusterSize ?? 0,
  }));

  if (sort === "risk") {
    results.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  const total = await prisma.fmcsaCarrier.count({ where });

  return Response.json({ results, total, limit, offset });
}
