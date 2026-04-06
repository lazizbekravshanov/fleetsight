/**
 * fetch_insurance_history — current and historical insurance filings.
 *
 * Returns aggregated coverage gap analysis + the most recent filings.
 */

import { getInsuranceByDot, type SocrataInsurance } from "@/lib/socrata";
import type { AgentTool } from "../types";

type Output = {
  total: number;
  records: SocrataInsurance[];
  rollup: {
    activeBipd: boolean;
    activeCargo: boolean;
    insurers: string[];
    earliestEffective: string | null;
    latestEffective: string | null;
    typesPresent: string[];
  };
};

export const fetchInsuranceHistory: AgentTool<{ dotNumber: string }, Output> = {
  name: "fetch_insurance_history",
  description:
    "Fetch insurance filings (BIPD liability, cargo, surety) for a USDOT and return current coverage status plus filing history. Use this to detect coverage lapses and insurance shopping (multiple insurers in short windows = red flag).",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const records = await getInsuranceByDot(dot);
    return { total: records.length, records, rollup: rollup(records) };
  },
  summarize(out) {
    if (out.total === 0) return "No insurance records on file";
    const r = out.rollup;
    const types = r.typesPresent.slice(0, 3).join(", ");
    return `${out.total} filings (${types}) from ${r.insurers.length} insurer${r.insurers.length === 1 ? "" : "s"}`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      total: out.total,
      rollup: out.rollup,
      recent: out.records.slice(0, 8).map((r) => ({
        type: r.mod_col_1 || null,
        insurer: r.name_company || null,
        policy: r.policy_no || null,
        effective: r.effective_date || null,
        cov: r.max_cov_amount || null,
      })),
    });
  },
};

function rollup(records: SocrataInsurance[]): Output["rollup"] {
  const insurers = new Set<string>();
  const types = new Set<string>();
  let earliestEffective: string | null = null;
  let latestEffective: string | null = null;
  let activeBipd = false;
  let activeCargo = false;

  for (const r of records) {
    if (r.name_company) insurers.add(r.name_company);
    if (r.mod_col_1) types.add(r.mod_col_1);
    if (r.effective_date) {
      if (!earliestEffective || r.effective_date < earliestEffective) earliestEffective = r.effective_date;
      if (!latestEffective || r.effective_date > latestEffective) latestEffective = r.effective_date;
    }
    const t = (r.mod_col_1 || "").toUpperCase();
    if (t.includes("BIPD")) activeBipd = true;
    if (t.includes("CARGO")) activeCargo = true;
  }

  return {
    activeBipd,
    activeCargo,
    insurers: Array.from(insurers).slice(0, 10),
    earliestEffective,
    latestEffective,
    typesPresent: Array.from(types),
  };
}
