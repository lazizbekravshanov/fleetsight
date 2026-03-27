import { prisma } from "@/lib/prisma";
import { getViolationInfo } from "@/lib/inspections/violation-codes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DriverScorecard = {
  cdlKey: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  cleanRate: number;
  driverOOSEvents: number;
  vehicleOOSEvents: number;
  topDriverViolations: {
    code: string;
    description: string;
    count: number;
    group: string;
  }[];
  topVehicleViolations: {
    code: string;
    description: string;
    count: number;
    group: string;
  }[];
  companyAvgCleanRate: number | null;
  performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
  trainingRecommendations: string[];
  estimatedRiskReduction: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MONTHS = 12;
const TOP_VIOLATIONS_COUNT = 5;

const DRIVER_GROUPS = new Set(["HOS", "DRIVER_FITNESS"]);

const TRAINING_MAP: Record<string, string> = {
  HOS: "HOS compliance refresher training",
  DRIVER_FITNESS: "Driver fitness and medical certification review",
  BRAKES: "Pre-trip brake inspection certification",
  LIGHTING: "Lighting and electrical systems inspection training",
  TIRES_WHEELS: "Tire condition and inflation inspection training",
  CARGO: "Cargo securement certification course",
  SUSPENSION: "Suspension and steering systems inspection training",
  COUPLING: "Coupling devices inspection training",
  HAZMAT: "Hazardous materials handling and documentation training",
  GENERAL: "Comprehensive vehicle inspection refresher",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isDriverGroup(group: string | null): boolean {
  return group != null && DRIVER_GROUPS.has(group);
}

function midpointDate(start: Date, end: Date): Date {
  return new Date((start.getTime() + end.getTime()) / 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generateDriverScorecard(
  cdlKey: string,
  dotNumber?: number,
  months?: number,
): Promise<DriverScorecard> {
  const lookback = months ?? DEFAULT_MONTHS;
  const periodStart = monthsAgo(lookback);
  const periodEnd = new Date();

  // ---- 1. Fetch driver's violations within the period --------------------

  const whereClause: {
    cdlKey: string;
    inspectionDate: { gte: Date; lte: Date };
    dotNumber?: number;
  } = {
    cdlKey,
    inspectionDate: { gte: periodStart, lte: periodEnd },
  };

  if (dotNumber != null) {
    whereClause.dotNumber = dotNumber;
  }

  const violations = await prisma.inspectionViolation.findMany({
    where: whereClause,
    orderBy: { inspectionDate: "desc" },
  });

  // Resolve dotNumber from most recent record if not provided
  const resolvedDot = dotNumber ?? (violations.length > 0 ? violations[0].dotNumber : null);

  if (violations.length === 0) {
    return {
      cdlKey,
      dotNumber: resolvedDot,
      period: { start: toISODate(periodStart), end: toISODate(periodEnd) },
      totalInspections: 0,
      cleanInspections: 0,
      cleanRate: 1,
      driverOOSEvents: 0,
      vehicleOOSEvents: 0,
      topDriverViolations: [],
      topVehicleViolations: [],
      companyAvgCleanRate: null,
      performanceTrend: "STABLE",
      trainingRecommendations: [],
      estimatedRiskReduction: "No violations to address.",
    };
  }

  // ---- 2. Unique inspections and clean count ----------------------------

  const inspectionIds = new Set<string>();
  for (const v of violations) {
    inspectionIds.add(v.inspectionId);
  }

  // Total inspections for this driver (including clean ones) from
  // FmcsaInspection or fallback to violation-only count.
  const totalInspectionRecords = await prisma.fmcsaInspection.count({
    where: {
      dotNumber: resolvedDot!,
      inspectionDate: { gte: periodStart, lte: periodEnd },
      // FmcsaInspection does not have cdlKey, so we count all for this DOT
      // and ratio from driver observations below if needed.
    },
  });

  // Use the driver's distinct inspectionIds from violations as a floor.
  // A driver's total inspection count is estimated from DriverObservation.
  const driverObservationCount = await prisma.driverObservation.count({
    where: {
      cdlKey,
      dotNumber: resolvedDot!,
      inspectionDate: { gte: periodStart, lte: periodEnd },
    },
  });

  // The best estimate of total inspections for THIS driver is the larger of
  // unique inspection IDs with violations and driver observations count.
  const totalInspections = Math.max(driverObservationCount, inspectionIds.size);
  const inspectionsWithViolations = inspectionIds.size;
  const cleanInspections = Math.max(totalInspections - inspectionsWithViolations, 0);
  const cleanRate = totalInspections > 0 ? cleanInspections / totalInspections : 1;

  // ---- 3. Separate driver vs vehicle violations -------------------------

  let driverOOSEvents = 0;
  let vehicleOOSEvents = 0;

  type CodeAgg = {
    code: string;
    description: string;
    group: string;
    count: number;
  };

  const driverCodeMap = new Map<string, CodeAgg>();
  const vehicleCodeMap = new Map<string, CodeAgg>();

  for (const v of violations) {
    const group = v.violationGroup ?? "UNKNOWN";
    const isDriver = isDriverGroup(group);
    const map = isDriver ? driverCodeMap : vehicleCodeMap;

    if (v.oosViolation) {
      if (isDriver) driverOOSEvents += 1;
      else vehicleOOSEvents += 1;
    }

    const existing = map.get(v.violationCode);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(v.violationCode, {
        code: v.violationCode,
        description: v.violationDescription ?? "",
        group,
        count: 1,
      });
    }
  }

  // ---- 4. Top violations with enrichment --------------------------------

  async function topViolations(
    map: Map<string, CodeAgg>,
    limit: number,
  ): Promise<DriverScorecard["topDriverViolations"]> {
    const sorted = Array.from(map.values()).sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, limit);

    return Promise.all(
      top.map(async (agg) => {
        const info = await getViolationInfo(agg.code);
        return {
          code: agg.code,
          description: info?.description ?? agg.description,
          count: agg.count,
          group: info?.group ?? agg.group,
        };
      }),
    );
  }

  const [topDriverViolations, topVehicleViolations] = await Promise.all([
    topViolations(driverCodeMap, TOP_VIOLATIONS_COUNT),
    topViolations(vehicleCodeMap, TOP_VIOLATIONS_COUNT),
  ]);

  // ---- 5. Company average clean rate ------------------------------------

  let companyAvgCleanRate: number | null = null;

  if (resolvedDot != null) {
    const companyViolations = await prisma.inspectionViolation.findMany({
      where: {
        dotNumber: resolvedDot,
        inspectionDate: { gte: periodStart, lte: periodEnd },
      },
      select: { inspectionId: true },
    });

    const companyInspectionIdsWithViolations = new Set(
      companyViolations.map((v) => v.inspectionId),
    );

    const companyTotalInspections =
      totalInspectionRecords > 0
        ? totalInspectionRecords
        : companyInspectionIdsWithViolations.size;

    if (companyTotalInspections > 0) {
      const companyClean = Math.max(
        companyTotalInspections - companyInspectionIdsWithViolations.size,
        0,
      );
      companyAvgCleanRate =
        Math.round((companyClean / companyTotalInspections) * 10000) / 10000;
    }
  }

  // ---- 6. Performance trend (first half vs second half) -----------------

  const midpoint = midpointDate(periodStart, periodEnd);

  let firstHalfCount = 0;
  let secondHalfCount = 0;

  for (const v of violations) {
    if (v.inspectionDate < midpoint) {
      firstHalfCount += 1;
    } else {
      secondHalfCount += 1;
    }
  }

  let performanceTrend: DriverScorecard["performanceTrend"];

  if (firstHalfCount === 0 && secondHalfCount === 0) {
    performanceTrend = "STABLE";
  } else if (firstHalfCount === 0) {
    // Violations appeared only in the second half -- declining
    performanceTrend = "DECLINING";
  } else {
    const changeRatio = (secondHalfCount - firstHalfCount) / firstHalfCount;
    if (changeRatio <= -0.2) {
      performanceTrend = "IMPROVING";
    } else if (changeRatio >= 0.2) {
      performanceTrend = "DECLINING";
    } else {
      performanceTrend = "STABLE";
    }
  }

  // ---- 7. Training recommendations -------------------------------------

  const violatedGroups = new Set<string>();
  for (const v of violations) {
    if (v.violationGroup) {
      violatedGroups.add(v.violationGroup);
    }
  }

  const trainingRecommendations: string[] = [];
  for (const group of violatedGroups) {
    const rec = TRAINING_MAP[group];
    if (rec) {
      trainingRecommendations.push(rec);
    }
  }

  // If no specific mapping matched, add a general recommendation
  if (trainingRecommendations.length === 0 && violations.length > 0) {
    trainingRecommendations.push(
      "Comprehensive vehicle and driver compliance refresher",
    );
  }

  // Sort for deterministic output
  trainingRecommendations.sort();

  // ---- 8. Estimated risk reduction --------------------------------------

  const totalOOS = driverOOSEvents + vehicleOOSEvents;
  let estimatedRiskReduction: string;

  if (totalOOS === 0) {
    estimatedRiskReduction =
      "No OOS events in the period. Continue current practices.";
  } else {
    // Calculate what % of OOS events come from the top 3 violation codes
    const allCodesSorted = [
      ...Array.from(driverCodeMap.values()),
      ...Array.from(vehicleCodeMap.values()),
    ].sort((a, b) => b.count - a.count);

    const top3Codes = new Set(allCodesSorted.slice(0, 3).map((c) => c.code));
    let top3OOS = 0;

    for (const v of violations) {
      if (v.oosViolation && top3Codes.has(v.violationCode)) {
        top3OOS += 1;
      }
    }

    const reductionPct = Math.round((top3OOS / totalOOS) * 100);
    estimatedRiskReduction = `Addressing top violations could reduce OOS risk by ~${reductionPct}% (${top3OOS} of ${totalOOS} OOS events).`;
  }

  // ---- 9. Build response ------------------------------------------------

  return {
    cdlKey,
    dotNumber: resolvedDot,
    period: { start: toISODate(periodStart), end: toISODate(periodEnd) },
    totalInspections,
    cleanInspections,
    cleanRate: Math.round(cleanRate * 10000) / 10000,
    driverOOSEvents,
    vehicleOOSEvents,
    topDriverViolations,
    topVehicleViolations,
    companyAvgCleanRate,
    performanceTrend,
    trainingRecommendations,
    estimatedRiskReduction,
  };
}
