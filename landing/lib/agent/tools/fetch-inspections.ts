/**
 * fetch_inspections — recent FMCSA roadside inspections + violation/OOS rollup.
 *
 * Returns aggregated stats + the 10 most recent inspections (truncated to fit budget).
 * Full inspection list lives in ToolCall.output for UI lazy-fetch.
 */

import { getInspectionsByDot, type SocrataInspection } from "@/lib/socrata";
import type { AgentTool } from "../types";

type Output = {
  total: number;
  inspections: SocrataInspection[]; // full list, persisted to ToolCall.output
  rollup: {
    total: number;
    last12mo: number;
    vehicleOosRate: number; // percent
    driverOosRate: number;  // percent
    levelCounts: Record<string, number>;
    stateCounts: Record<string, number>;
    earliest: string | null;
    latest: string | null;
  };
};

export const fetchInspections: AgentTool<{ dotNumber: string; limit?: number }, Output> = {
  name: "fetch_inspections",
  description:
    "Fetch recent roadside inspections for a USDOT and return aggregate stats (total, OOS rates, level/state breakdown) plus the 10 most recent records. Use this to assess inspection cadence, OOS trends, and inspection geography. The vehicle OOS rate above 25% or driver OOS rate above 5% is concerning.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      limit: { type: "integer", description: "Max inspections to fetch (default 100, max 200)", minimum: 1, maximum: 200 },
    },
  },
  async execute({ dotNumber, limit }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const inspections = await getInspectionsByDot(dot, Math.min(limit ?? 100, 200));
    return { total: inspections.length, inspections, rollup: rollup(inspections) };
  },
  summarize(out) {
    const r = out.rollup;
    return `${r.total} inspections, vehicle OOS ${r.vehicleOosRate.toFixed(1)}%, driver OOS ${r.driverOosRate.toFixed(1)}%${r.last12mo > 0 ? `, ${r.last12mo} in last 12mo` : ""}`;
  },
  serializeForModel(out) {
    const recent = out.inspections.slice(0, 10).map((i) => ({
      date: i.insp_date || null,
      state: i.report_state || null,
      level: i.insp_level_id || null,
      violations: numOrZero(i.viol_total),
      oos: numOrZero(i.oos_total),
      vehicleOos: numOrZero(i.vehicle_oos_total),
      driverOos: numOrZero(i.driver_oos_total),
      hazmatOos: numOrZero(i.hazmat_oos_total),
    }));
    return JSON.stringify({ rollup: out.rollup, recent });
  },
};

function rollup(insps: SocrataInspection[]): Output["rollup"] {
  const total = insps.length;
  let vehicleOos = 0;
  let driverOos = 0;
  const levelCounts: Record<string, number> = {};
  const stateCounts: Record<string, number> = {};
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  let last12mo = 0;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const i of insps) {
    if (numOrZero(i.vehicle_oos_total) > 0) vehicleOos++;
    if (numOrZero(i.driver_oos_total) > 0) driverOos++;
    if (i.insp_level_id) levelCounts[i.insp_level_id] = (levelCounts[i.insp_level_id] || 0) + 1;
    if (i.report_state) stateCounts[i.report_state] = (stateCounts[i.report_state] || 0) + 1;
    if (i.insp_date) {
      const t = Date.parse(i.insp_date);
      if (Number.isFinite(t)) {
        if (t > cutoff) last12mo++;
        if (!earliest || i.insp_date < earliest) earliest = i.insp_date;
        if (!latest || i.insp_date > latest) latest = i.insp_date;
      }
    }
  }

  return {
    total,
    last12mo,
    vehicleOosRate: total > 0 ? (vehicleOos / total) * 100 : 0,
    driverOosRate: total > 0 ? (driverOos / total) * 100 : 0,
    levelCounts,
    stateCounts,
    earliest,
    latest,
  };
}

function numOrZero(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}
