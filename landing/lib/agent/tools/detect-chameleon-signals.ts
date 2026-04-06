/**
 * detect_chameleon_signals — run the full anomaly/chameleon detection pipeline.
 *
 * Wraps lib/detection-signals.computeAllSignals(). Internally fetches:
 *   - the carrier itself
 *   - insurance history (for cross-match anomalies)
 *   - authority history (for authority mill detection)
 *   - prior carrier (if priorRevokeFlag → broker reincarnation match)
 *
 * Returns severity-ranked anomaly flags + the structured authority-mill and
 * broker-reincarnation signals.
 */

import {
  getCarrierByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
} from "@/lib/socrata";
import { computeAllSignals, type AnomalyFlag } from "@/lib/detection-signals";
import type { AgentTool } from "../types";

type Output = ReturnType<typeof computeAllSignals> & {
  carrierFound: boolean;
};

export const detectChameleonSignals: AgentTool<{ dotNumber: string }, Output> = {
  name: "detect_chameleon_signals",
  description:
    "Run the full chameleon/shell-carrier/authority-mill/broker-reincarnation detection pipeline for a USDOT. Returns severity-ranked anomaly flags AND structured authority-mill stats AND broker-reincarnation match details. Call this whenever fraud or identity-shifting is a concern. The result includes any 'critical'-severity flags.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);

    const [carrier, insurance, authorityHistory] = await Promise.all([
      getCarrierByDot(dot),
      getInsuranceByDot(dot).catch(() => []),
      getAuthorityHistoryByDot(dot).catch(() => []),
    ]);
    if (!carrier) {
      return {
        carrierFound: false,
        anomalyFlags: [],
        authorityMill: { grantCount: 0, revokeCount: 0, avgDaysBetween: 0, isMillPattern: false },
        brokerReincarnation: { priorDot: null, addressMatch: false, phoneMatch: false, officerMatch: false, isReincarnation: false },
      };
    }

    // Look up prior carrier if priorRevokeFlag is set
    let priorCarrier = null;
    if (carrier.prior_revoke_flag === "Y" && carrier.prior_revoke_dot) {
      const priorDot = parseInt(carrier.prior_revoke_dot, 10);
      if (Number.isFinite(priorDot)) {
        priorCarrier = await getCarrierByDot(priorDot).catch(() => null);
      }
    }

    const result = computeAllSignals({ carrier, insurance, authorityHistory, priorCarrier });
    return { carrierFound: true, ...result };
  },
  summarize(out) {
    if (!out.carrierFound) return "Carrier not found";
    const counts = countBySeverity(out.anomalyFlags);
    const parts: string[] = [];
    if (counts.critical) parts.push(`${counts.critical} CRITICAL`);
    if (counts.high) parts.push(`${counts.high} high`);
    if (counts.medium) parts.push(`${counts.medium} medium`);
    if (counts.low) parts.push(`${counts.low} low`);
    if (parts.length === 0) return "No chameleon signals detected";
    return `${out.anomalyFlags.length} flags (${parts.join(", ")})`;
  },
  serializeForModel(out) {
    if (!out.carrierFound) return JSON.stringify({ found: false });
    return JSON.stringify({
      found: true,
      severityCounts: countBySeverity(out.anomalyFlags),
      flags: out.anomalyFlags.map((f) => ({
        id: f.id,
        severity: f.severity,
        label: f.label,
        detail: f.detail.slice(0, 200),
      })),
      authorityMill: out.authorityMill,
      brokerReincarnation: out.brokerReincarnation,
    });
  },
};

function countBySeverity(flags: AnomalyFlag[]): Record<string, number> {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of flags) counts[f.severity] = (counts[f.severity] || 0) + 1;
  return counts;
}
