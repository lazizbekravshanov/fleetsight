/**
 * compute_quick_risk — fast lightweight risk grade from census fields only.
 *
 * No FMCSA API calls. Just shell-carrier check, MCS-150 staleness, authority age, and status.
 */

import { getCarrierByDot } from "@/lib/socrata";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import type { AgentTool } from "../types";

type Output = { found: boolean; grade: string; score: number };

export const computeQuickRisk: AgentTool<{ dotNumber: string }, Output> = {
  name: "compute_quick_risk",
  description:
    "Compute a fast lightweight risk grade (A–F) for a USDOT from census fields only — no inspections needed. Use this when you need a quick gut-check or are screening many carriers. Returns a 0–100 score where higher = riskier.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const carrier = await getCarrierByDot(dot);
    if (!carrier) return { found: false, grade: "F", score: 100 };
    const result = computeQuickRiskIndicator({
      powerUnits: parseIntOrUndef(carrier.power_units),
      totalDrivers: parseIntOrUndef(carrier.total_drivers),
      addDate: carrier.add_date,
      mcs150Date: carrier.mcs150_date,
      statusCode: carrier.status_code,
    });
    return { found: true, ...result };
  },
  summarize(out) {
    if (!out.found) return "Carrier not found";
    return `Quick risk grade ${out.grade} (score ${out.score})`;
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};

function parseIntOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
