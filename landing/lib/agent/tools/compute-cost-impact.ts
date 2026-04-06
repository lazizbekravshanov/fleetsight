/**
 * compute_cost_impact — annualized cost of OOS violations and projected savings.
 */

import { generateCostImpact } from "@/lib/inspections/cost-model";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof generateCostImpact>>;

export const computeCostImpact: AgentTool<{ dotNumber: string; months?: number }, Output> = {
  name: "compute_cost_impact",
  description:
    "Estimate the annual financial impact of OOS violations on a USDOT (direct repair/tow costs + revenue lost to delays + insurance premium increase) and the projected savings if the top issues were fixed. Use this when discussing whether to keep or replace a carrier from a cost-of-doing-business angle.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      months: { type: "integer", minimum: 1, maximum: 36 },
    },
  },
  async execute({ dotNumber, months }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    return generateCostImpact(dot, undefined, months ?? 12);
  },
  summarize(out) {
    return `Annual impact ~$${(out.totalAnnualImpact || 0).toLocaleString()}, potential savings ~$${(out.totalProjectedSavings || 0).toLocaleString()}`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      period: out.period,
      annualOOSEvents: out.annualOOSEvents,
      totalAnnualImpact: out.totalAnnualImpact,
      annualDirectCost: out.annualDirectCost,
      annualRevenueLost: out.annualRevenueLost,
      estimatedInsurancePremiumIncrease: out.estimatedInsurancePremiumIncrease,
      totalProjectedSavings: out.totalProjectedSavings,
      topCostlyViolations: out.topCostlyViolations.slice(0, 5),
      topActions: out.topActions.slice(0, 5),
    });
  },
};
