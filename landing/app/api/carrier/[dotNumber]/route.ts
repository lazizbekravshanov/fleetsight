import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getPeerBenchmark,
} from "@/lib/socrata";
import { getCarrierBasics, getCarrierAuthority, getCarrierOos, getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import { isSmartWayPartner } from "@/lib/smartway";

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

  // Fetch carrier + lightweight counts for inspections/crashes (for tab badges)
  const [carrier, inspections, crashes] = await Promise.all([
    getCarrierByDot(dotNumber),
    getInspectionsByDot(dotNumber).catch(() => []),
    getCrashesByDot(dotNumber).catch(() => []),
  ]);

  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  // Optional FMCSA API data — non-fatal if key is missing
  let basics: unknown = null;
  let authority: unknown = null;
  let oos: unknown = null;
  let profile: unknown = null;
  try {
    [basics, authority, oos, profile] = await Promise.all([
      getCarrierBasics(String(dotNumber)).catch(() => null),
      getCarrierAuthority(String(dotNumber)).catch(() => null),
      getCarrierOos(String(dotNumber)).catch(() => null),
      getCarrierProfile(String(dotNumber)).catch(() => null),
    ]);
  } catch {
    // FMCSA_WEBKEY may not be configured — skip silently
  }

  // Extract safety rating from profile
  let safetyRating: string | null = null;
  let safetyRatingDate: string | null = null;
  const carrierRecord = extractCarrierRecord(profile);
  if (carrierRecord) {
    const rating = carrierRecord.safetyRating ?? carrierRecord.safety_rating;
    if (rating && typeof rating === "string" && rating !== "None") {
      safetyRating = rating;
    }
    const ratingDate = carrierRecord.safetyRatingDate ?? carrierRecord.safety_rating_date;
    if (ratingDate && typeof ratingDate === "string") {
      safetyRatingDate = ratingDate;
    }
  }

  // SmartWay partner check
  const smartwayPartner = isSmartWayPartner(carrier.legal_name);

  // Peer benchmark — depends on carrier's fleetsize, non-fatal
  let peerBenchmark = null;
  try {
    peerBenchmark = await getPeerBenchmark(carrier.fleetsize);
  } catch {
    // Non-fatal
  }

  return Response.json({
    carrier,
    basics,
    authority,
    oos,
    peerBenchmark,
    safetyRating,
    safetyRatingDate,
    smartwayPartner,
    inspectionCount: inspections.length,
    crashCount: crashes.length,
  });
}
