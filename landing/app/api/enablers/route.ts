import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  tier: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qp = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    tier: searchParams.get("tier") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  const limit = qp.success && qp.data.limit ? qp.data.limit : 50;

  try {
    const where: Record<string, unknown> = {};

    if (qp.success && qp.data.q) {
      where.nameNormalized = { contains: qp.data.q.toUpperCase().trim() };
    }
    if (qp.success && qp.data.type) {
      where.enablerType = qp.data.type.toUpperCase();
    }
    if (qp.success && qp.data.tier) {
      where.riskTier = qp.data.tier.toUpperCase();
    }

    const enablers = await prisma.enabler.findMany({
      where,
      orderBy: { riskScore: "desc" },
      take: limit,
      select: {
        id: true,
        enablerType: true,
        name: true,
        city: true,
        state: true,
        clientCount: true,
        activeClientCount: true,
        oosClientCount: true,
        chameleonClientCount: true,
        riskScore: true,
        riskTier: true,
      },
    });

    return Response.json({ enablers, total: enablers.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Enabler search error:", msg);
    return jsonError(`Failed to search enablers: ${msg}`, 500);
  }
}
