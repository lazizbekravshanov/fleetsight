import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getVinCarriers } from "@/lib/affiliation-detection";
import { normalizeVin } from "@/lib/vin-utils";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
  vin: z.string().min(11).max(17),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string; vin: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid parameters", 400);
  }

  const normalized = normalizeVin(parsed.data.vin);
  if (!normalized) {
    return jsonError("Invalid VIN format", 400);
  }

  const carriers = await getVinCarriers(normalized);

  if (carriers.length === 0) {
    return jsonError("VIN not found", 404);
  }

  return Response.json({
    vin: normalized,
    vehicle: carriers[0]?.vehicle ?? null,
    carriers: carriers.map((c) => ({
      dotNumber: c.dotNumber,
      legalName: c.legalName,
      statusCode: c.statusCode,
      unitType: c.unitType,
      firstSeenAt: c.firstSeenAt,
      lastSeenAt: c.lastSeenAt,
      source: c.source,
    })),
  });
}
