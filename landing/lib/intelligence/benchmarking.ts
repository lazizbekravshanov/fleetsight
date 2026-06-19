/* ── Peer Benchmarking ────────────────────────────────────────────────
   Phase 1: compares a carrier against FMCSA national averages (works now).
   Phase 2 swaps `national` for a real cohort (same fleet-size band + state +
   cargo) once the census corpus is ingested — same output shape, mode flips
   to "cohort". Pure + deterministic. */

export type NationalAverages = {
  vehicleOos: number; // percent
  driverOos: number; // percent
  crashesPerPowerUnit: number;
};

// FMCSA national averages already used elsewhere in the app (SAFER parity).
export const NATIONAL_AVERAGES: NationalAverages = {
  vehicleOos: 20.72,
  driverOos: 5.51,
  crashesPerPowerUnit: 0.04,
};

export type Cohort = {
  fleetSizeBand: string;
  carrierCount: number;
  avgPowerUnits: number;
  avgDrivers: number;
  yourPowerUnits: number | null;
  yourDrivers: number | null;
};

export type StateCohortRow = {
  metric: "vehicle_oos" | "driver_oos";
  value: number;
  cohortAvg: number;
  better: boolean; // lower OOS rate is better
};

export type StateCohort = {
  state: string;
  sampleSize: number;
  rows: StateCohortRow[];
};

export type StateSafetyInput = {
  state: string;
  vehicleOosRate: number;
  driverOosRate: number;
  sampleSize: number;
};

export type BenchmarkInput = {
  vehicleOosRate: number | null;
  driverOosRate: number | null;
  crashesPerPowerUnit: number | null;
  national?: NationalAverages;
  /** Live cohort context (same fleet-size band) from the Socrata census. */
  cohort?: Cohort;
  /** Live geographic (state) safety cohort from the inspections dataset. */
  stateCohort?: StateSafetyInput;
};

export type BenchmarkRow = {
  metric: "vehicle_oos" | "driver_oos" | "crashes_per_power_unit";
  value: number;
  national: number;
  deltaPct: number; // signed % difference vs national
  better: boolean; // lower is better for all three metrics
};

export type Benchmark = {
  rows: BenchmarkRow[];
  betterThanNationalCount: number;
  mode: "national" | "cohort";
  cohort: Cohort | null;
  stateCohort: StateCohort | null;
};

export function computeBenchmark(input: BenchmarkInput): Benchmark {
  const national = input.national ?? NATIONAL_AVERAGES;
  const defs: { metric: BenchmarkRow["metric"]; value: number | null; nat: number }[] = [
    { metric: "vehicle_oos", value: input.vehicleOosRate, nat: national.vehicleOos },
    { metric: "driver_oos", value: input.driverOosRate, nat: national.driverOos },
    { metric: "crashes_per_power_unit", value: input.crashesPerPowerUnit, nat: national.crashesPerPowerUnit },
  ];

  const rows: BenchmarkRow[] = [];
  for (const d of defs) {
    if (d.value == null) continue;
    const deltaPct = d.nat !== 0 ? ((d.value - d.nat) / d.nat) * 100 : 0;
    rows.push({ metric: d.metric, value: d.value, national: d.nat, deltaPct, better: d.value < d.nat });
  }

  const cohort = input.cohort && input.cohort.carrierCount > 0 ? input.cohort : null;

  let stateCohort: StateCohort | null = null;
  const sc = input.stateCohort;
  if (sc && sc.sampleSize > 0) {
    const scRows: StateCohortRow[] = [];
    if (input.vehicleOosRate != null) {
      scRows.push({ metric: "vehicle_oos", value: input.vehicleOosRate, cohortAvg: sc.vehicleOosRate, better: input.vehicleOosRate < sc.vehicleOosRate });
    }
    if (input.driverOosRate != null) {
      scRows.push({ metric: "driver_oos", value: input.driverOosRate, cohortAvg: sc.driverOosRate, better: input.driverOosRate < sc.driverOosRate });
    }
    if (scRows.length > 0) stateCohort = { state: sc.state, sampleSize: sc.sampleSize, rows: scRows };
  }

  return {
    rows,
    betterThanNationalCount: rows.filter((r) => r.better).length,
    mode: cohort ? "cohort" : "national",
    cohort,
    stateCohort,
  };
}
