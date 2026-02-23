import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  getCarrierByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
  getInsuranceByPolicy,
} from "@/lib/socrata";
import type { InsuranceCrossMatch } from "@/lib/detection-signals";
import { computeAllSignals } from "@/lib/detection-signals";

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

  // Fetch primary data in parallel
  const [carrier, insurance, authorityHistory] = await Promise.all([
    getCarrierByDot(dotNumber),
    getInsuranceByDot(dotNumber).catch(() => []),
    getAuthorityHistoryByDot(dotNumber).catch(() => []),
  ]);

  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  // Fetch prior carrier for reincarnation check
  let priorCarrier = null;
  if (carrier.prior_revoke_dot) {
    const priorDot = parseInt(carrier.prior_revoke_dot, 10);
    if (priorDot > 0) {
      priorCarrier = await getCarrierByDot(priorDot).catch(() => null);
    }
  }

  // Run all detection signals
  const { anomalyFlags, authorityMill, brokerReincarnation } = computeAllSignals({
    carrier,
    insurance,
    authorityHistory,
    priorCarrier,
  });

  // Shared insurance cross-matching: find other DOTs sharing the same policies
  const sharedInsurance: InsuranceCrossMatch[] = [];

  // Extract unique policy numbers (cap at 10 to avoid hammering Socrata)
  const policyNumbers = [
    ...new Set(
      insurance
        .map((p) => p.policy_no?.trim())
        .filter((p): p is string => !!p && p.length > 0)
    ),
  ].slice(0, 10);

  // Look up each policy to find other carriers
  const policyResults = await Promise.all(
    policyNumbers.map(async (policyNo) => {
      try {
        const matches = await getInsuranceByPolicy(policyNo);
        // Filter out self
        const otherDots = [
          ...new Set(
            matches
              .map((m) => parseInt(m.dot_number, 10))
              .filter((d) => !isNaN(d) && d !== dotNumber)
          ),
        ];
        if (otherDots.length > 0) {
          const insurer =
            matches.find((m) => m.name_company)?.name_company ?? "Unknown";
          return {
            policyNumber: policyNo,
            insurerName: insurer,
            matchingDots: otherDots,
          } satisfies InsuranceCrossMatch;
        }
      } catch {
        // Non-fatal — skip failed policy lookups
      }
      return null;
    })
  );

  for (const result of policyResults) {
    if (result) sharedInsurance.push(result);
  }

  return Response.json({
    anomalyFlags,
    authorityMill: {
      grantCount: authorityMill.grantCount,
      revokeCount: authorityMill.revokeCount,
      avgDaysBetween: authorityMill.avgDaysBetween,
      isMillPattern: authorityMill.isMillPattern,
    },
    brokerReincarnation: {
      priorDot: brokerReincarnation.priorDot,
      addressMatch: brokerReincarnation.addressMatch,
      phoneMatch: brokerReincarnation.phoneMatch,
      officerMatch: brokerReincarnation.officerMatch,
      isReincarnation: brokerReincarnation.isReincarnation,
    },
    sharedInsurance,
  });
}
