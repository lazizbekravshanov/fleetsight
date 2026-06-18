/* ── Safety Trajectory ────────────────────────────────────────────────
   Net-new: derives "is this carrier getting safer or riskier?" purely from
   the dated inspection/crash history the carrier page already fetches.
   Pure + deterministic (caller passes `asOf`), no I/O, server-safe. */

export type DatedInspection = { date: string; oos: boolean; violations: number };
export type DatedCrash = { date: string };

export type TrajectoryInput = {
  inspections: DatedInspection[];
  crashes: DatedCrash[];
  /** ISO date used as "now" so the result is deterministic and testable. */
  asOf: string;
};

export type YearStat = {
  year: number;
  inspections: number;
  /** percent (0-100) of inspections that were out-of-service that year */
  oosRate: number;
  violationsPerInspection: number;
  crashes: number;
};

export type TrajectoryVerdict = "improving" | "stable" | "deteriorating" | "insufficient_data";

export type Trajectory = {
  byYear: YearStat[];
  /** OOS-rate change (percentage points) of latest year vs prior year; null if <2 years */
  oosRateDelta: number | null;
  daysSinceLastInspection: number | null;
  daysSinceLastCrash: number | null;
  avgInspectionGapDays: number | null;
  verdict: TrajectoryVerdict;
};

const DAY_MS = 86_400_000;

function parseUTC(d: string): number {
  return Date.parse(d && d.length === 10 ? `${d}T00:00:00Z` : d);
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / DAY_MS);
}

export function computeTrajectory(input: TrajectoryInput): Trajectory {
  const asOfMs = parseUTC(input.asOf);

  const sortByDate = <T extends { date: string }>(rows: T[]) =>
    rows.filter((r) => r.date && !Number.isNaN(parseUTC(r.date))).sort((a, b) => parseUTC(a.date) - parseUTC(b.date));

  const inspections = sortByDate(input.inspections);
  const crashes = sortByDate(input.crashes);

  type Bucket = { n: number; oos: number; viol: number; crashes: number };
  const byYearMap = new Map<number, Bucket>();
  const bucket = (year: number): Bucket => {
    let b = byYearMap.get(year);
    if (!b) { b = { n: 0, oos: 0, viol: 0, crashes: 0 }; byYearMap.set(year, b); }
    return b;
  };
  for (const i of inspections) {
    const b = bucket(new Date(parseUTC(i.date)).getUTCFullYear());
    b.n += 1;
    b.oos += i.oos ? 1 : 0;
    b.viol += i.violations ?? 0;
  }
  for (const c of crashes) {
    bucket(new Date(parseUTC(c.date)).getUTCFullYear()).crashes += 1;
  }

  const byYear: YearStat[] = [...byYearMap.entries()]
    .map(([year, b]) => ({
      year,
      inspections: b.n,
      oosRate: b.n > 0 ? (b.oos / b.n) * 100 : 0,
      violationsPerInspection: b.n > 0 ? b.viol / b.n : 0,
      crashes: b.crashes,
    }))
    .sort((a, b) => a.year - b.year);

  const daysSinceLastInspection = inspections.length
    ? daysBetween(parseUTC(inspections[inspections.length - 1].date), asOfMs)
    : null;
  const daysSinceLastCrash = crashes.length
    ? daysBetween(parseUTC(crashes[crashes.length - 1].date), asOfMs)
    : null;

  let avgInspectionGapDays: number | null = null;
  if (inspections.length >= 2) {
    let total = 0;
    for (let k = 1; k < inspections.length; k++) {
      total += daysBetween(parseUTC(inspections[k - 1].date), parseUTC(inspections[k].date));
    }
    avgInspectionGapDays = total / (inspections.length - 1);
  }

  const inspYears = byYear.filter((y) => y.inspections > 0);
  let oosRateDelta: number | null = null;
  let verdict: TrajectoryVerdict = "insufficient_data";
  if (inspYears.length >= 2) {
    const latest = inspYears[inspYears.length - 1];
    const prior = inspYears[inspYears.length - 2];
    oosRateDelta = latest.oosRate - prior.oosRate;
    verdict = oosRateDelta > 5 ? "deteriorating" : oosRateDelta < -5 ? "improving" : "stable";
  }

  return { byYear, oosRateDelta, daysSinceLastInspection, daysSinceLastCrash, avgInspectionGapDays, verdict };
}
