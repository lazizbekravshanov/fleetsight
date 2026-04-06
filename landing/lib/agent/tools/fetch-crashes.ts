/**
 * fetch_crashes — recent FMCSA crash records + fatality/injury rollup.
 *
 * Returns aggregated stats + the 10 most-severe crashes (by fatalities, injuries).
 * Full crash list lives in ToolCall.output.
 */

import { getCrashesByDot, type SocrataCrash } from "@/lib/socrata";
import type { AgentTool } from "../types";

type Output = {
  total: number;
  crashes: SocrataCrash[];
  rollup: {
    total: number;
    fatalCrashes: number;
    injuryCrashes: number;
    towAwayCrashes: number;
    fatalities: number;
    injuries: number;
    last12mo: number;
    stateCounts: Record<string, number>;
    earliest: string | null;
    latest: string | null;
  };
};

export const fetchCrashes: AgentTool<{ dotNumber: string; limit?: number }, Output> = {
  name: "fetch_crashes",
  description:
    "Fetch FMCSA-reportable crash records for a USDOT and return aggregated stats (totals, fatalities, injuries, tow-aways, geography, last-12-month count) plus the 10 most severe crashes. Use this to assess crash frequency and severity. Any fatal crash is a serious flag.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      limit: { type: "integer", minimum: 1, maximum: 200 },
    },
  },
  async execute({ dotNumber, limit }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const crashes = await getCrashesByDot(dot, Math.min(limit ?? 50, 200));
    return { total: crashes.length, crashes, rollup: rollup(crashes) };
  },
  summarize(out) {
    const r = out.rollup;
    if (r.total === 0) return "No crashes on record";
    return `${r.total} crashes (${r.fatalities} fatalities, ${r.injuries} injuries${r.last12mo > 0 ? `, ${r.last12mo} in last 12mo` : ""})`;
  },
  serializeForModel(out) {
    const top = [...out.crashes]
      .sort((a, b) => (numOrZero(b.fatalities) * 10 + numOrZero(b.injuries)) - (numOrZero(a.fatalities) * 10 + numOrZero(a.injuries)))
      .slice(0, 10)
      .map((c) => ({
        date: c.report_date || null,
        state: c.report_state || null,
        city: c.city || null,
        fatalities: numOrZero(c.fatalities),
        injuries: numOrZero(c.injuries),
        towAway: c.tow_away === "Y" || c.tow_away === "true",
      }));
    return JSON.stringify({ rollup: out.rollup, mostSevere: top });
  },
};

function rollup(crashes: SocrataCrash[]): Output["rollup"] {
  const total = crashes.length;
  let fatalCrashes = 0;
  let injuryCrashes = 0;
  let towAwayCrashes = 0;
  let fatalities = 0;
  let injuries = 0;
  const stateCounts: Record<string, number> = {};
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  let last12mo = 0;
  let earliest: string | null = null;
  let latest: string | null = null;

  for (const c of crashes) {
    const f = numOrZero(c.fatalities);
    const i = numOrZero(c.injuries);
    if (f > 0) fatalCrashes++;
    if (i > 0) injuryCrashes++;
    if (c.tow_away === "Y" || c.tow_away === "true") towAwayCrashes++;
    fatalities += f;
    injuries += i;
    if (c.report_state) stateCounts[c.report_state] = (stateCounts[c.report_state] || 0) + 1;
    if (c.report_date) {
      const t = Date.parse(c.report_date);
      if (Number.isFinite(t)) {
        if (t > cutoff) last12mo++;
        if (!earliest || c.report_date < earliest) earliest = c.report_date;
        if (!latest || c.report_date > latest) latest = c.report_date;
      }
    }
  }

  return { total, fatalCrashes, injuryCrashes, towAwayCrashes, fatalities, injuries, last12mo, stateCounts, earliest, latest };
}

function numOrZero(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}
