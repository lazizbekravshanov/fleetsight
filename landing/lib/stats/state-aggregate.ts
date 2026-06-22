/* ── National safety map: per-state aggregation ───────────────────────
   Pure: merges live Socrata inspection + crash aggregates into a per-state
   shape the choropleth consumes, with the per-metric maxima for the color
   scale. No I/O — unit-tested. */

export type StateMetrics = { inspections: number; crashes: number; fatalities: number };
export type StateMap = { states: Record<string, StateMetrics>; max: StateMetrics };

export type InspectionRow = { report_state?: string; n?: string | number };
export type CrashRow = { report_state?: string; crashes?: string | number; fatalities?: string | number };

const VALID_STATE = /^[A-Z]{2}$/;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export function buildStateMap(inspectionRows: InspectionRow[], crashRows: CrashRow[]): StateMap {
  const states: Record<string, StateMetrics> = {};
  const ensure = (raw?: string): StateMetrics | null => {
    const st = (raw ?? "").trim().toUpperCase();
    if (!VALID_STATE.test(st)) return null;
    if (!states[st]) states[st] = { inspections: 0, crashes: 0, fatalities: 0 };
    return states[st];
  };

  for (const r of inspectionRows) {
    const s = ensure(r.report_state);
    if (s) s.inspections += num(r.n);
  }
  for (const r of crashRows) {
    const s = ensure(r.report_state);
    if (s) {
      s.crashes += num(r.crashes);
      s.fatalities += num(r.fatalities);
    }
  }

  const max: StateMetrics = { inspections: 0, crashes: 0, fatalities: 0 };
  for (const s of Object.values(states)) {
    max.inspections = Math.max(max.inspections, s.inspections);
    max.crashes = Math.max(max.crashes, s.crashes);
    max.fatalities = Math.max(max.fatalities, s.fatalities);
  }

  return { states, max };
}
