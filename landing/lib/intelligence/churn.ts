/* ── VIN & Driver Churn ───────────────────────────────────────────────
   Net-new instability signal: how much of a carrier's fleet/driver roster
   turns over. Computed from the longitudinal CarrierVehicle / DriverObservation
   records that accrue via ingestion — so it lights up as data is gathered and
   reports hasData=false on a cold carrier. Pure + deterministic. */

const DAY_MS = 86_400_000;
const ACTIVE_WINDOW_DAYS = 365;

const parseUTC = (d: string): number => Date.parse(d && d.length === 10 ? `${d}T00:00:00Z` : d);

export type VinObservationLite = { vin: string; lastSeenAt: string };
export type DriverObservationLite = { cdlKey: string; inspectionDate: string };

export type ChurnInput = {
  vins: VinObservationLite[];
  drivers: DriverObservationLite[];
  asOf: string;
};

export type ChurnResult = {
  vinsTotal: number;
  vinsChurned: number;
  vinChurnRate: number; // percent of distinct VINs no longer active
  driversTotal: number;
  driversChurned: number;
  driverChurnRate: number;
  hasData: boolean;
};

function churnOf(lastSeenByKey: Map<string, number>, asOfMs: number): { total: number; churned: number; rate: number } {
  const total = lastSeenByKey.size;
  if (total === 0) return { total: 0, churned: 0, rate: 0 };
  let churned = 0;
  for (const last of lastSeenByKey.values()) {
    if (asOfMs - last > ACTIVE_WINDOW_DAYS * DAY_MS) churned += 1;
  }
  return { total, churned, rate: (churned / total) * 100 };
}

export function computeChurn(input: ChurnInput): ChurnResult {
  const asOfMs = parseUTC(input.asOf);

  const lastSeen = (entries: Iterable<{ key: string; date: string }>) => {
    const m = new Map<string, number>();
    for (const e of entries) {
      const ms = parseUTC(e.date);
      if (Number.isNaN(ms)) continue;
      const prev = m.get(e.key);
      if (prev === undefined || ms > prev) m.set(e.key, ms);
    }
    return m;
  };

  const vinMap = lastSeen(input.vins.map((v) => ({ key: v.vin, date: v.lastSeenAt })));
  const driverMap = lastSeen(input.drivers.map((d) => ({ key: d.cdlKey, date: d.inspectionDate })));

  const v = churnOf(vinMap, asOfMs);
  const dr = churnOf(driverMap, asOfMs);

  return {
    vinsTotal: v.total,
    vinsChurned: v.churned,
    vinChurnRate: v.rate,
    driversTotal: dr.total,
    driversChurned: dr.churned,
    driverChurnRate: dr.rate,
    hasData: input.vins.length > 0 || input.drivers.length > 0,
  };
}
