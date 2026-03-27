import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { ingestVinObservations } from "@/lib/affiliation-detection";

/**
 * POST /api/data/vin-observations/import
 * Bulk import VIN observations from JSON payload.
 *
 * Body: { observations: [{ vin, dotNumber, inspectionDate, vehicleType?, unitMake?, unitYear?, state? }] }
 * Max 5000 per request.
 */
export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.observations) ? body.observations : [];

  if (raw.length === 0) {
    return jsonError("No observations provided", 400);
  }
  if (raw.length > 5000) {
    return jsonError("Max 5000 observations per request", 400);
  }

  const observations = raw
    .filter(
      (o: unknown): o is { vin: string; dotNumber: number; inspectionDate: string } =>
        typeof o === "object" && o !== null &&
        typeof (o as Record<string, unknown>).vin === "string" &&
        typeof (o as Record<string, unknown>).dotNumber === "number" &&
        typeof (o as Record<string, unknown>).inspectionDate === "string"
    )
    .map((o: Record<string, unknown>) => ({
      vin: o.vin as string,
      dotNumber: o.dotNumber as number,
      inspectionDate: new Date(o.inspectionDate as string),
      inspectionId: o.inspectionId as string | undefined,
      state: o.state as string | undefined,
      vehicleType: o.vehicleType as string | undefined,
      unitMake: o.unitMake as string | undefined,
      unitYear: o.unitYear as number | undefined,
    }));

  if (observations.length === 0) {
    return jsonError("No valid observations. Each needs vin (string), dotNumber (number), inspectionDate (ISO string).", 400);
  }

  const result = await ingestVinObservations(observations);

  return Response.json({
    submitted: raw.length,
    valid: observations.length,
    ingested: result.ingested,
    skipped: result.skipped,
  });
}
