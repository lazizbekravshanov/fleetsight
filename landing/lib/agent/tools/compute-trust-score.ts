/**
 * compute_trust_score — composite 0–100 trust score from BASICs, inspections,
 * crashes, insurance, authority history, fleet size, and structural signals.
 *
 * Wraps lib/intelligence/trust-score.computeTrustScore(). Internally fetches
 * the dependencies in parallel.
 */

import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
} from "@/lib/socrata";
import { getCarrierBasics } from "@/lib/fmcsa";
import { computeTrustScore, type IntelBasicScore, type TrustResult } from "@/lib/intelligence/trust-score";
import type { AgentTool } from "../types";

type Output = TrustResult & { found: boolean };

export const computeTrustScoreTool: AgentTool<{ dotNumber: string }, Output> = {
  name: "compute_trust_score",
  description:
    "Compute a 0–100 composite trust score for a USDOT, weighted: Safety 30% (BASIC percentiles, OOS, crashes), Compliance 25% (MCS-150 recency, insurance, authority status), Fraud 25% (shell, VoIP, shared attrs), Stability 20% (authority age, insurance continuity). Returns the overall score, letter grade A–F, and per-component breakdown with reasons. Use this for quantitative summary.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);

    const [carrier, inspections, crashes, insurance, authorityHistory, basicsRaw] = await Promise.all([
      getCarrierByDot(dot),
      getInspectionsByDot(dot, 100).catch(() => []),
      getCrashesByDot(dot, 50).catch(() => []),
      getInsuranceByDot(dot).catch(() => []),
      getAuthorityHistoryByDot(dot).catch(() => []),
      getCarrierBasics(dotNumber).catch(() => null),
    ]);

    if (!carrier) {
      return {
        found: false,
        overall: 0,
        grade: "F" as const,
        components: [],
      };
    }

    const basicScores = extractBasicScores(basicsRaw);
    const result = computeTrustScore({
      basicScores,
      inspections,
      crashes,
      insurance,
      authorityHistory,
      mcs150Date: carrier.mcs150_date,
      addDate: carrier.add_date,
      powerUnits: numOrUndef(carrier.power_units),
      totalDrivers: numOrUndef(carrier.total_drivers),
      statusCode: carrier.status_code,
      isHazmat: carrier.hm_ind === "Y",
    });

    return { found: true, ...result };
  },
  summarize(out) {
    if (!out.found) return "Carrier not found";
    return `Trust score ${out.overall}/100 (grade ${out.grade})`;
  },
  serializeForModel(out) {
    if (!out.found) return JSON.stringify({ found: false });
    return JSON.stringify({
      found: true,
      overall: out.overall,
      grade: out.grade,
      components: out.components.map((c) => ({
        name: c.name,
        score: c.score,
        weight: c.weight,
        weighted: c.weighted,
        details: c.details.slice(0, 5),
      })),
    });
  },
};

function extractBasicScores(payload: unknown): IntelBasicScore[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const content = obj.content && typeof obj.content === "object" ? (obj.content as Record<string, unknown>) : obj;
  const basics = (content.basics ?? obj.basics) as unknown;
  if (!Array.isArray(basics)) return [];
  return basics
    .map((b): IntelBasicScore | null => {
      if (!b || typeof b !== "object") return null;
      const o = b as Record<string, unknown>;
      const id = Number(o.basicsId ?? o.basics_id);
      const description = String(o.basicsDescription ?? o.basics_description ?? "");
      const percentile = Number(o.percentile);
      if (!Number.isFinite(id) || !Number.isFinite(percentile)) return null;
      return { basicsId: id, basicsDescription: description, percentile };
    })
    .filter((b): b is IntelBasicScore => b !== null);
}

function numOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
