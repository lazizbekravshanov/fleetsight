import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getSharedVinsForCarrier } from "@/lib/affiliation-detection";
import { prisma } from "@/lib/prisma";
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
  const cacheKey = `affiliations:${dotNumber}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    return Response.json(cached);
  }

  // Get live shared VIN analysis
  const affiliations = await getSharedVinsForCarrier(dotNumber);

  // Also get total VIN count for this carrier
  const totalVins = await prisma.carrierVehicle.count({
    where: { dotNumber },
  });

  const response = {
    dotNumber,
    totalVins,
    affiliatedCarrierCount: affiliations.length,
    totalSharedVinCount: affiliations.reduce((s, a) => s + a.sharedVinCount, 0),
    affiliations: affiliations.map((a) => ({
      dotNumber: a.dotNumber,
      legalName: a.legalName,
      statusCode: a.statusCode,
      sharedVinCount: a.sharedVinCount,
      sharedVins: a.sharedVins,
      affiliationScore: a.affiliationScore,
      affiliationType: a.affiliationType,
      signals: a.signals,
    })),
  };

  await cacheSet(cacheKey, response, 3600);

  return Response.json(response);
}
