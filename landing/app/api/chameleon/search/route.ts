import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { searchCarriers } from "@/lib/socrata";

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

  const { q, sort, limit } = parsed.data;

  // Search the full FMCSA census via Socrata API
  const socrataResults = await searchCarriers(q, limit);

  // Collect DOT numbers to look up local risk scores
  const dotNumbers = socrataResults
    .map((r) => parseInt(r.dot_number, 10))
    .filter((n) => !isNaN(n));

  // Batch-fetch local risk scores for all returned carriers
  const localScores =
    dotNumbers.length > 0
      ? await prisma.carrierRiskScore.findMany({
          where: { dotNumber: { in: dotNumbers } },
          select: { dotNumber: true, compositeScore: true, chameleonScore: true, clusterSize: true },
        })
      : [];

  const scoreMap = new Map(localScores.map((s) => [s.dotNumber, s]));

  let results = socrataResults.map((r) => {
    const dot = parseInt(r.dot_number, 10);
    const score = scoreMap.get(dot);
    return {
      dotNumber: dot,
      legalName: r.legal_name ?? "",
      dbaName: r.dba_name ?? null,
      statusCode: r.status_code ?? null,
      compositeScore: score?.compositeScore ?? 0,
      chameleonScore: score?.chameleonScore ?? 0,
      clusterSize: score?.clusterSize ?? 0,
    };
  });

  if (sort === "risk") {
    results.sort((a, b) => b.compositeScore - a.compositeScore);
  } else if (sort === "name") {
    results.sort((a, b) => a.legalName.localeCompare(b.legalName));
  } else if (sort === "dot") {
    results.sort((a, b) => a.dotNumber - b.dotNumber);
  }

  return Response.json({ results, total: results.length, limit, offset: 0 });
}
