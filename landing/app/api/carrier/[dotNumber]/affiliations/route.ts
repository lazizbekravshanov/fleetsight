import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getAffiliationsForCarrier } from "@/lib/affiliation-detection";
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

  // Check 1-hour cache
  const cacheKey = `affiliations:v2:${dotNumber}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) return Response.json(cached);

  const data = await getAffiliationsForCarrier(dotNumber);

  const response = {
    dotNumber,
    totalVins: data.totalVins,
    affiliatedCarrierCount: data.affiliations.length,
    totalSharedVinCount: data.affiliations.reduce((s, a) => s + a.sharedVinCount, 0),
    cluster: data.cluster,
    affiliations: data.affiliations.map((a) => ({
      dotNumber: a.dotNumber,
      legalName: a.legalName,
      statusCode: a.statusCode,
      sharedVinCount: a.sharedVinCount,
      score: a.score,
      type: a.type,
      signals: a.signals,
      reasons: a.reasons,
      sharedVins: a.sharedVins.map((v) => ({
        vin: v.vin,
        vehicleType: v.vehicleType,
        overlapDays: v.overlapDays,
        gapDays: v.gapDays,
        transferDirection: v.transferDirection,
        carrierAFirstSeen: v.carrierAFirstSeen?.toISOString() ?? null,
        carrierALastSeen: v.carrierALastSeen?.toISOString() ?? null,
        carrierBFirstSeen: v.carrierBFirstSeen?.toISOString() ?? null,
        carrierBLastSeen: v.carrierBLastSeen?.toISOString() ?? null,
      })),
    })),
  };

  await cacheSet(cacheKey, response, 3600);

  return Response.json(response);
}
