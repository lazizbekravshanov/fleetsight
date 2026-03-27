import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { computeTrustScore } from "@/lib/graph/trust-score";
import { cacheGet, cacheSet } from "@/lib/cache";

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

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  const cacheKey = `trust:${dotNumber}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return Response.json(cached);

  const result = await computeTrustScore(dotNumber);

  const response = {
    dotNumber,
    ...result,
  };

  await cacheSet(cacheKey, response, 1800); // 30-min cache

  return Response.json(response);
}
