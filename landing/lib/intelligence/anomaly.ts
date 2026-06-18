/* ── Behavioral Anomaly ───────────────────────────────────────────────
   Net-new chameleon-adjacent signals derived from data already fetched:
   fleet-vs-activity mismatch, inspection drought (evasion), insurer churn.
   Pure + deterministic. VIN/driver churn is Phase 2 (needs ingested data). */

const DAY_MS = 86_400_000;
const FLEET_THRESHOLD = 5;
const DROUGHT_DAYS = 365;

export type InsurancePolicy = { insurer: string; from: string; to: string | null };

export type AnomalyInput = {
  powerUnits: number | null;
  inspections: { date: string }[];
  insurancePolicies: InsurancePolicy[];
  asOf: string;
};

export type AnomalyResult = {
  inspectionsLast12mo: number;
  daysSinceLastInspection: number | null;
  fleetActivityFlag: boolean;
  droughtFlag: boolean;
  insurerCount: number;
  insurerChanges: number;
  lapseCount: number;
  insurerChurnFlag: boolean;
  anomalies: string[];
};

function parseUTC(d: string): number {
  return Date.parse(d && d.length === 10 ? `${d}T00:00:00Z` : d);
}

export function detectAnomalies(input: AnomalyInput): AnomalyResult {
  const asOfMs = parseUTC(input.asOf);
  const powerUnits = input.powerUnits ?? 0;

  const inspectionMs = input.inspections
    .map((i) => parseUTC(i.date))
    .filter((m) => !Number.isNaN(m) && m <= asOfMs)
    .sort((a, b) => a - b);

  const inspectionsLast12mo = inspectionMs.filter((m) => asOfMs - m <= 365 * DAY_MS).length;
  const lastInspectionMs = inspectionMs.length ? inspectionMs[inspectionMs.length - 1] : null;
  const daysSinceLastInspection =
    lastInspectionMs != null ? Math.round((asOfMs - lastInspectionMs) / DAY_MS) : null;

  const fleetActivityFlag = powerUnits >= FLEET_THRESHOLD && inspectionsLast12mo === 0;
  const droughtFlag =
    powerUnits >= FLEET_THRESHOLD && daysSinceLastInspection != null && daysSinceLastInspection > DROUGHT_DAYS;

  const policies = input.insurancePolicies
    .filter((p) => p.from && !Number.isNaN(parseUTC(p.from)))
    .sort((a, b) => parseUTC(a.from) - parseUTC(b.from));
  const insurerCount = new Set(policies.map((p) => p.insurer).filter(Boolean)).size;
  const insurerChanges = Math.max(0, insurerCount - 1);
  let lapseCount = 0;
  for (let k = 1; k < policies.length; k++) {
    const prevTo = policies[k - 1].to;
    if (prevTo && !Number.isNaN(parseUTC(prevTo))) {
      const gapDays = Math.round((parseUTC(policies[k].from) - parseUTC(prevTo)) / DAY_MS);
      if (gapDays > 1) lapseCount += 1;
    }
  }
  const insurerChurnFlag = insurerChanges >= 3 || lapseCount >= 1;

  const anomalies: string[] = [];
  if (fleetActivityFlag) anomalies.push("fleet_activity_mismatch");
  if (droughtFlag) anomalies.push("inspection_drought");
  if (insurerChurnFlag) anomalies.push("insurer_churn");

  return {
    inspectionsLast12mo,
    daysSinceLastInspection,
    fleetActivityFlag,
    droughtFlag,
    insurerCount,
    insurerChanges,
    lapseCount,
    insurerChurnFlag,
    anomalies,
  };
}
