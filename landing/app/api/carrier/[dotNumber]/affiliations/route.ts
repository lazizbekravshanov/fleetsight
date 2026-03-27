import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getAffiliationsForCarrier } from "@/lib/affiliation-detection";
import { cacheGet, cacheSet } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { getInspectionsByDot, getFleetUnitsByInspectionIds } from "@/lib/socrata";
import { decodeVinBatch } from "@/lib/nhtsa";
import { persistFleetVins } from "@/lib/vin-persistence";

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

  // Auto-populate VINs from Socrata if this carrier has no VINs stored yet
  let existingVinCount = 0;
  try {
    existingVinCount = await prisma.carrierVehicle.count({
      where: { dotNumber },
    });
  } catch {
    // Table may not exist yet — return empty response
    return Response.json({
      dotNumber,
      totalVins: 0,
      affiliatedCarrierCount: 0,
      totalSharedVinCount: 0,
      cluster: null,
      affiliations: [],
    });
  }

  if (existingVinCount === 0) {
    try {
      const inspections = await getInspectionsByDot(dotNumber, 50).catch(() => []);
      const inspectionIds = inspections
        .map((i) => i.inspection_id)
        .filter((id): id is string => !!id);

      if (inspectionIds.length > 0) {
        const units = await getFleetUnitsByInspectionIds(inspectionIds).catch(() => []);
        const uniqueVins = [
          ...new Set(
            units
              .map((u) => u.insp_unit_vehicle_id_number?.trim())
              .filter((v): v is string => !!v && v.length >= 11)
          ),
        ];
        const decoded = await decodeVinBatch(uniqueVins).catch(() => []);
        await persistFleetVins(dotNumber, units, decoded);
      }
    } catch {
      // Non-fatal — proceed with whatever data we have
    }
  }

  let data;
  try {
    data = await getAffiliationsForCarrier(dotNumber);
  } catch {
    return Response.json({
      dotNumber,
      totalVins: existingVinCount,
      affiliatedCarrierCount: 0,
      totalSharedVinCount: 0,
      cluster: null,
      affiliations: [],
    });
  }

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
