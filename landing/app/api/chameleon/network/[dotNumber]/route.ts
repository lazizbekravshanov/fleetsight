import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const focusDot = parseInt(parsed.data.dotNumber, 10);

  // Find all links involving this DOT
  const directLinks = await prisma.carrierLink.findMany({
    where: {
      OR: [{ dotNumberA: focusDot }, { dotNumberB: focusDot }],
    },
    orderBy: { score: "desc" },
    take: 100,
  });

  // Collect all involved DOT numbers
  const involvedDots = new Set<number>([focusDot]);
  for (const link of directLinks) {
    involvedDots.add(link.dotNumberA);
    involvedDots.add(link.dotNumberB);
  }

  // Also get links between the involved DOTs (2nd-degree edges for graph context)
  const dotArray = Array.from(involvedDots);
  const interLinks = dotArray.length > 1
    ? await prisma.carrierLink.findMany({
        where: {
          dotNumberA: { in: dotArray },
          dotNumberB: { in: dotArray },
        },
        orderBy: { score: "desc" },
        take: 200,
      })
    : [];

  // Deduplicate edges
  const edgeMap = new Map<string, typeof directLinks[0]>();
  for (const link of [...directLinks, ...interLinks]) {
    const key = `${Math.min(link.dotNumberA, link.dotNumberB)}_${Math.max(link.dotNumberA, link.dotNumberB)}`;
    if (!edgeMap.has(key) || link.score > edgeMap.get(key)!.score) {
      edgeMap.set(key, link);
    }
  }

  // Collect all dots from all edges
  for (const link of edgeMap.values()) {
    involvedDots.add(link.dotNumberA);
    involvedDots.add(link.dotNumberB);
  }

  // Fetch carrier info and risk scores
  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: Array.from(involvedDots) } },
    include: { riskScore: { select: { compositeScore: true } } },
  });

  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));

  // Build D3-compatible graph
  const nodes = Array.from(involvedDots).map((dot) => {
    const c = carrierMap.get(dot);
    return {
      id: dot,
      label: c?.legalName ?? `DOT ${dot}`,
      riskScore: c?.riskScore?.compositeScore ?? 0,
      priorRevoke: c?.priorRevokeFlag === "Y",
      statusCode: c?.statusCode ?? null,
      isFocus: dot === focusDot,
    };
  });

  const edges = Array.from(edgeMap.values()).map((link) => ({
    source: link.dotNumberA,
    target: link.dotNumberB,
    score: link.score,
    reasons: JSON.parse(link.reasonsJson),
  }));

  return Response.json({ nodes, edges });
}
