/**
 * compute_driver_scorecard — per-driver violation/OOS history.
 *
 * Driver scorecards are indexed by CDL key (e.g. "CA12345678"). Pass an
 * optional dotNumber to scope the lookup to one carrier when the same CDL
 * appears across multiple carriers.
 */

import { generateDriverScorecard } from "@/lib/inspections/driver-scorecard";
import type { AgentTool } from "../types";

type Input = { cdlKey: string; dotNumber?: string; months?: number };
type Output = Awaited<ReturnType<typeof generateDriverScorecard>>;

export const computeDriverScorecard: AgentTool<Input, Output> = {
  name: "compute_driver_scorecard",
  description:
    "Generate a violation/OOS history scorecard for a single driver (identified by CDL key like 'CA12345678'). Use this after spotting a high-violation driver in inspection records to investigate that driver's full history. Optionally scope to a specific USDOT.",
  inputSchema: {
    type: "object",
    required: ["cdlKey"],
    properties: {
      cdlKey: { type: "string", description: "CDL key, e.g. 'CA12345678' (state + number)" },
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      months: { type: "integer", minimum: 1, maximum: 36 },
    },
  },
  async execute({ cdlKey, dotNumber, months }) {
    const dot = dotNumber ? parseInt(dotNumber, 10) : undefined;
    return generateDriverScorecard(cdlKey, dot, months);
  },
  summarize(out) {
    const o = out as Record<string, unknown>;
    const inspections = typeof o.totalInspections === "number" ? o.totalInspections : 0;
    const violations = typeof o.totalViolations === "number" ? o.totalViolations : 0;
    return `${inspections} inspections, ${violations} violations`;
  },
  serializeForModel(out) {
    return JSON.stringify(out).slice(0, 4000);
  },
};
