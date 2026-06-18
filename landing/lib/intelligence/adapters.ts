/* ── Intelligence adapters ────────────────────────────────────────────
   Maps the raw Socrata/FMCSA data the carrier page already fetches into the
   pure compute modules, and composes them behind per-compute guards so a
   failure in any one stat degrades to a safe fallback instead of throwing.
   Server-safe (no "use client"), pure. */

import type { SocrataInspection, SocrataCrash, SocrataInsurance } from "@/lib/socrata";
import type { BasicScore } from "@/components/carrier/types";
import { computeTrajectory, type Trajectory, type DatedInspection, type DatedCrash } from "./trajectory";
import { detectAnomalies, type AnomalyResult, type InsurancePolicy } from "./anomaly";
import { computeBenchmark, type Benchmark } from "./benchmarking";
import { computeOutlook, type Outlook } from "./outlook";

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
};

const DAY_MS = 86_400_000;
const parseUTC = (d: string): number => Date.parse(d && d.length === 10 ? `${d}T00:00:00Z` : d);

export type CarrierIntelligence = {
  trajectory: Trajectory;
  anomaly: AnomalyResult;
  benchmark: Benchmark;
  outlook: Outlook;
};

export type IntelligenceInput = {
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  insurance: SocrataInsurance[];
  basics: BasicScore[];
  powerUnits: number | null;
  asOf: string;
};

export function toDatedInspections(rows: SocrataInspection[]): DatedInspection[] {
  return rows
    .filter((r) => r.insp_date)
    .map((r) => ({ date: r.insp_date as string, oos: num(r.oos_total) > 0, violations: num(r.viol_total) }));
}

export function toDatedCrashes(rows: SocrataCrash[]): DatedCrash[] {
  return rows.filter((r) => r.report_date).map((r) => ({ date: r.report_date as string }));
}

export function toInsurancePolicies(rows: SocrataInsurance[]): InsurancePolicy[] {
  // Socrata exposes effective_date but no reliable end date, so `to` stays null
  // (insurer count/changes are the meaningful Phase-1 churn signal).
  return rows
    .filter((r) => r.effective_date)
    .map((r) => ({ insurer: r.name_company ?? "", from: r.effective_date as string, to: null }));
}

export function oosRates(rows: SocrataInspection[]): { vehicleOosRate: number | null; driverOosRate: number | null } {
  if (rows.length === 0) return { vehicleOosRate: null, driverOosRate: null };
  const vehicle = rows.filter((r) => num(r.vehicle_oos_total) > 0).length;
  const driver = rows.filter((r) => num(r.driver_oos_total) > 0).length;
  return { vehicleOosRate: (vehicle / rows.length) * 100, driverOosRate: (driver / rows.length) * 100 };
}

export function recentFatalCrash(rows: SocrataCrash[], asOf: string): boolean {
  const asOfMs = parseUTC(asOf);
  return rows.some((r) => {
    if (num(r.fatalities) <= 0 || !r.report_date) return false;
    const ms = parseUTC(r.report_date);
    if (Number.isNaN(ms)) return false;
    const age = asOfMs - ms;
    return age >= 0 && age <= 730 * DAY_MS;
  });
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function buildIntelligence(input: IntelligenceInput): CarrierIntelligence {
  const { inspections, crashes, insurance, basics, powerUnits, asOf } = input;

  const trajectory = safe(
    () => computeTrajectory({ inspections: toDatedInspections(inspections), crashes: toDatedCrashes(crashes), asOf }),
    { byYear: [], oosRateDelta: null, daysSinceLastInspection: null, daysSinceLastCrash: null, avgInspectionGapDays: null, verdict: "insufficient_data" }
  );

  const anomaly = safe(
    () => detectAnomalies({ powerUnits, inspections: toDatedInspections(inspections), insurancePolicies: toInsurancePolicies(insurance), asOf }),
    { inspectionsLast12mo: 0, daysSinceLastInspection: null, fleetActivityFlag: false, droughtFlag: false, insurerCount: 0, insurerChanges: 0, lapseCount: 0, insurerChurnFlag: false, anomalies: [] }
  );

  const rates = safe(() => oosRates(inspections), { vehicleOosRate: null, driverOosRate: null });
  const crashesPerPowerUnit = powerUnits && powerUnits > 0 ? crashes.length / powerUnits : null;
  const benchmark = safe(
    () => computeBenchmark({ vehicleOosRate: rates.vehicleOosRate, driverOosRate: rates.driverOosRate, crashesPerPowerUnit }),
    { rows: [], betterThanNationalCount: 0, mode: "national" }
  );

  const worstBasicPercentile = basics.length ? Math.max(...basics.map((b) => b.percentile ?? 0)) : null;
  const outlook = safe(
    () =>
      computeOutlook({
        trajectoryVerdict: trajectory.verdict,
        worstBasicPercentile,
        recentFatalCrash: safe(() => recentFatalCrash(crashes, asOf), false),
        insurerChurn: anomaly.insurerChurnFlag,
        authorityInstability: false, // Phase 2: derive from authority history
        chameleonScore: null, // Phase 2: feed chameleon detection score
      }),
    { score: 0, band: "stable", factors: [] }
  );

  return { trajectory, anomaly, benchmark, outlook };
}
