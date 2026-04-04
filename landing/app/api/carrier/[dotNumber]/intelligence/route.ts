import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
} from "@/lib/socrata";
import { getCarrierBasics } from "@/lib/fmcsa";
import { checkVoipIndicators } from "@/lib/voip-check";
import { checkSecretaryOfState } from "@/lib/opencorporates";
import { computeTrustScore, type TrustResult } from "@/lib/intelligence/trust-score";
import { detectRiskSignals, type RiskSignal } from "@/lib/intelligence/risk-signals";
import type { IntelBasicScore } from "@/lib/intelligence/trust-score";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) return jsonError("Invalid USDOT number", 400);

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  // Cache for 30 min — intelligence data doesn't change that frequently
  const cacheKey = `intel:${dotNumber}`;
  const cached = await cacheGet<{ trustScore: TrustResult; riskSignals: RiskSignal[] }>(cacheKey);
  if (cached) return Response.json(cached);

  // Fetch all data in parallel
  const [carrier, inspections, crashes, insurance, authorityHistory, basicsRaw] = await Promise.all([
    getCarrierByDot(dotNumber),
    getInspectionsByDot(dotNumber, 100).catch(() => []),
    getCrashesByDot(dotNumber, 50).catch(() => []),
    getInsuranceByDot(dotNumber, 50).catch(() => []),
    getAuthorityHistoryByDot(dotNumber, 50).catch(() => []),
    getCarrierBasics(String(dotNumber)).catch(() => null),
  ]);

  if (!carrier) return jsonError("Carrier not found", 404);

  // Parse BASIC scores from FMCSA response
  let basicScores: IntelBasicScore[] = [];
  if (basicsRaw && typeof basicsRaw === "object") {
    const obj = basicsRaw as Record<string, unknown>;
    const content = obj.content ?? obj;
    const measures = (content as Record<string, unknown>)?.basics ?? (content as Record<string, unknown>)?.basicsArray;
    if (Array.isArray(measures)) {
      basicScores = measures.map((m: Record<string, unknown>) => ({
        basicsId: Number(m.basicsId ?? m.basics_id ?? 0),
        basicsDescription: String(m.basicsDescription ?? m.basics_description ?? ""),
        percentile: Number(m.basicsPercentile ?? m.basics_percentile ?? 0),
      }));
    }
  }

  // Quick checks in parallel
  const [voip, sosResult] = await Promise.all([
    Promise.resolve(checkVoipIndicators(carrier.phone)),
    checkSecretaryOfState(carrier.legal_name, carrier.phy_state).catch(() => ({
      found: false, matchQuality: "none" as const, registrationStatus: null,
      registeredName: null, jurisdiction: null, opencorporatesUrl: null,
    })),
  ]);

  const powerUnits = carrier.power_units ? parseInt(carrier.power_units, 10) : undefined;
  const totalDrivers = carrier.total_drivers ? parseInt(carrier.total_drivers, 10) : undefined;

  // Compute Trust Score
  const trustScore = computeTrustScore({
    basicScores,
    inspections,
    crashes,
    insurance,
    authorityHistory,
    mcs150Date: carrier.mcs150_date,
    addDate: carrier.add_date,
    powerUnits,
    totalDrivers,
    statusCode: carrier.status_code,
    isHazmat: carrier.hm_ind === "Y",
    isVoip: voip.isLikelyVoip,
    sosMatchQuality: sosResult.matchQuality,
  });

  // Detect Risk Signals
  const riskSignals = detectRiskSignals({
    carrier,
    basicScores,
    inspections,
    crashes,
    insurance,
    authorityHistory,
    isVoip: voip.isLikelyVoip,
    sosMatchQuality: sosResult.matchQuality,
  });

  const result = { trustScore, riskSignals };
  await cacheSet(cacheKey, result, 1800); // 30 min

  return Response.json(result);
}
