import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getPeerBenchmark,
  searchCarriersByAddress,
} from "@/lib/socrata";
import { getCarrierBasics, getCarrierAuthority, getCarrierOos, getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import { isSmartWayPartner } from "@/lib/smartway";
import { checkVoipIndicators } from "@/lib/voip-check";
import { checkSecretaryOfState } from "@/lib/opencorporates";

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

  // Extract live FMCSA status from profile
  // FMCSA API shape: { content: { carrier: { allowedToOperate, statusCode, oosDate, ... } } }
  let safetyRating: string | null = null;
  let safetyRatingDate: string | null = null;
  let allowedToOperate: string | null = null;
  let oosDate: string | null = null;
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
    // allowedToOperate is "Y" or "N" — the definitive operating status from FMCSA
    if (typeof carrierRecord.allowedToOperate === "string") {
      allowedToOperate = carrierRecord.allowedToOperate;
    }
    // oosDate on the profile indicates an active out-of-service order
    if (typeof carrierRecord.oosDate === "string" && carrierRecord.oosDate) {
      oosDate = carrierRecord.oosDate;
    }
  }

  // Derive USDOT status from allowedToOperate flag
  let usdotStatus: string | null = null;
  if (allowedToOperate === "Y") {
    usdotStatus = "AUTHORIZED";
  } else if (allowedToOperate === "N") {
    usdotStatus = oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";
  }

  // Extract operating authority summary from FMCSA authority data
  // FMCSA shape: { content: [ { carrierAuthority: { commonAuthorityStatus, contractAuthorityStatus, brokerAuthorityStatus, ... } } ] }
  let operatingAuthorityStatus: string | null = null;
  if (authority && typeof authority === "object") {
    const authObj = authority as Record<string, unknown>;
    const content = authObj.content;
    if (Array.isArray(content) && content.length > 0) {
      // Each entry has a carrierAuthority object
      const statuses: string[] = [];
      for (const entry of content) {
        const ca = (entry as Record<string, unknown>).carrierAuthority as Record<string, unknown> | undefined;
        if (!ca) continue;
        // Check all authority type statuses: A = Active, N = None/Inactive
        if (ca.commonAuthorityStatus === "A") statuses.push("Common");
        if (ca.contractAuthorityStatus === "A") statuses.push("Contract");
        if (ca.brokerAuthorityStatus === "A") statuses.push("Broker");
      }
      if (statuses.length > 0) {
        operatingAuthorityStatus = "ACTIVE";
      } else {
        operatingAuthorityStatus = "NONE ACTIVE";
      }
    }
  }

  // Extract OOS orders from the OOS endpoint
  // FMCSA shape: { content: [ { oos: { oosDate, oosReason, oosReasonDescription } } ] }
  let hasActiveOos = false;
  let oosReason: string | null = null;
  if (oos && typeof oos === "object") {
    const oosObj = oos as Record<string, unknown>;
    const content = oosObj.content;
    if (Array.isArray(content) && content.length > 0) {
      hasActiveOos = true;
      const firstOos = (content[0] as Record<string, unknown>).oos as Record<string, unknown> | undefined;
      if (firstOos?.oosReasonDescription && typeof firstOos.oosReasonDescription === "string") {
        oosReason = firstOos.oosReasonDescription;
      }
    }
  }

  // Also check profile-level oosDate as backup (some carriers have oosDate on profile but empty /oos endpoint)
  if (!hasActiveOos && oosDate) {
    hasActiveOos = true;
  }

  // Build consolidated FMCSA status object
  const fmcsaStatus = (usdotStatus || operatingAuthorityStatus || hasActiveOos)
    ? { usdotStatus, operatingAuthorityStatus, hasActiveOos, oosDate, oosReason }
    : null;

  // SmartWay partner check
  const smartwayPartner = isSmartWayPartner(carrier.legal_name);

  // Parallel: peer benchmark, VoIP check, SoS check, affiliated carriers
  const [peerBenchmark, voip, sosResult, addressMatches] = await Promise.all([
    getPeerBenchmark(carrier.fleetsize).catch(() => null),
    Promise.resolve(checkVoipIndicators(carrier.phone)),
    checkSecretaryOfState(carrier.legal_name, carrier.phy_state).catch(() => ({
      found: false,
      matchQuality: "none" as const,
      registrationStatus: null,
      registeredName: null,
      jurisdiction: null,
      opencorporatesUrl: null,
    })),
    carrier.phy_street && carrier.phy_city && carrier.phy_state
      ? searchCarriersByAddress(carrier.phy_street, carrier.phy_city, carrier.phy_state).catch(() => [])
      : Promise.resolve([]),
  ]);

  // Filter affiliated carriers (exclude self)
  const affiliatedCarriers = addressMatches
    .filter((m) => m.dot_number !== String(dotNumber))
    .map((m) => ({
      dotNumber: m.dot_number,
      legalName: m.legal_name,
      statusCode: m.status_code,
    }));

  return Response.json({
    carrier,
    basics,
    authority,
    oos,
    peerBenchmark,
    safetyRating,
    safetyRatingDate,
    smartwayPartner,
    fmcsaStatus,
    inspectionCount: inspections.length,
    crashCount: crashes.length,
    voip,
    sosResult,
    affiliatedCarriers: affiliatedCarriers.length > 0 ? affiliatedCarriers : undefined,
  });
}
