import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type HeatmapFacility = {
  state: string;
  facility: string;
  totalInspections: number;
  oosInspections: number;
  oosRate: number;
  mostCommonGroup: string;
  topViolationCodes: { code: string; count: number }[];
};

export type HeatmapData = {
  period: { start: string; end: string };
  facilities: HeatmapFacility[];
  stateStats: {
    state: string;
    totalInspections: number;
    oosRate: number;
  }[];
  nationalAvgOosRate: number;
};

/* ------------------------------------------------------------------ */
/*  Main function                                                      */
/* ------------------------------------------------------------------ */

export async function getEnforcementHeatmap(
  opts?: { state?: string; months?: number },
): Promise<HeatmapData> {
  const months = opts?.months ?? 12;
  const stateFilter = opts?.state?.toUpperCase();

  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);

  /* ---- Fetch all violations in the period ---- */

  const violations = await prisma.inspectionViolation.findMany({
    where: {
      inspectionDate: { gte: start, lte: now },
      inspectionFacility: { not: null },
    },
    select: {
      inspectionId: true,
      inspectionState: true,
      inspectionFacility: true,
      violationCode: true,
      violationGroup: true,
      oosViolation: true,
    },
  });

  /* ---- Build per-facility aggregation ---- */

  type FacilityAgg = {
    state: string;
    facility: string;
    inspectionIds: Set<string>;
    oosInspectionIds: Set<string>;
    groupCounts: Map<string, number>;
    codeCounts: Map<string, number>;
  };

  const facilityKey = (state: string, facility: string) =>
    `${state}||${facility}`;

  const facilityMap = new Map<string, FacilityAgg>();

  for (const v of violations) {
    if (!v.inspectionState || !v.inspectionFacility) continue;

    const key = facilityKey(v.inspectionState, v.inspectionFacility);
    let agg = facilityMap.get(key);
    if (!agg) {
      agg = {
        state: v.inspectionState,
        facility: v.inspectionFacility,
        inspectionIds: new Set(),
        oosInspectionIds: new Set(),
        groupCounts: new Map(),
        codeCounts: new Map(),
      };
      facilityMap.set(key, agg);
    }

    agg.inspectionIds.add(v.inspectionId);

    if (v.oosViolation) {
      agg.oosInspectionIds.add(v.inspectionId);
    }

    if (v.violationGroup) {
      agg.groupCounts.set(
        v.violationGroup,
        (agg.groupCounts.get(v.violationGroup) ?? 0) + 1,
      );
    }

    agg.codeCounts.set(
      v.violationCode,
      (agg.codeCounts.get(v.violationCode) ?? 0) + 1,
    );
  }

  /* ---- Convert to HeatmapFacility[] ---- */

  const allFacilities: HeatmapFacility[] = [];

  for (const agg of facilityMap.values()) {
    const totalInspections = agg.inspectionIds.size;
    const oosInspections = agg.oosInspectionIds.size;
    const oosRate =
      totalInspections > 0 ? oosInspections / totalInspections : 0;

    // Most common violation group
    let mostCommonGroup = "Unknown";
    let maxGroupCount = 0;
    for (const [group, count] of agg.groupCounts) {
      if (count > maxGroupCount) {
        maxGroupCount = count;
        mostCommonGroup = group;
      }
    }

    // Top 3 violation codes
    const topViolationCodes = [...agg.codeCounts.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));

    allFacilities.push({
      state: agg.state,
      facility: agg.facility,
      totalInspections,
      oosInspections,
      oosRate: Math.round(oosRate * 10000) / 10000,
      mostCommonGroup,
      topViolationCodes,
    });
  }

  // Sort by OOS rate descending
  allFacilities.sort((a, b) => b.oosRate - a.oosRate);

  /* ---- State-level stats (computed from ALL data) ---- */

  type StateAgg = {
    inspectionIds: Set<string>;
    oosInspectionIds: Set<string>;
  };

  const stateMap = new Map<string, StateAgg>();

  for (const agg of facilityMap.values()) {
    let stateAgg = stateMap.get(agg.state);
    if (!stateAgg) {
      stateAgg = { inspectionIds: new Set(), oosInspectionIds: new Set() };
      stateMap.set(agg.state, stateAgg);
    }
    for (const id of agg.inspectionIds) stateAgg.inspectionIds.add(id);
    for (const id of agg.oosInspectionIds) stateAgg.oosInspectionIds.add(id);
  }

  const stateStats = [...stateMap.entries()]
    .map(([state, agg]) => {
      const totalInspections = agg.inspectionIds.size;
      const oosCount = agg.oosInspectionIds.size;
      return {
        state,
        totalInspections,
        oosRate:
          totalInspections > 0
            ? Math.round((oosCount / totalInspections) * 10000) / 10000
            : 0,
      };
    })
    .sort((a, b) => b.oosRate - a.oosRate);

  /* ---- National average OOS rate ---- */

  const nationalInspectionIds = new Set<string>();
  const nationalOosIds = new Set<string>();
  for (const agg of facilityMap.values()) {
    for (const id of agg.inspectionIds) nationalInspectionIds.add(id);
    for (const id of agg.oosInspectionIds) nationalOosIds.add(id);
  }

  const nationalAvgOosRate =
    nationalInspectionIds.size > 0
      ? Math.round(
          (nationalOosIds.size / nationalInspectionIds.size) * 10000,
        ) / 10000
      : 0;

  /* ---- Apply state filter to facilities (if provided) ---- */

  const facilities = stateFilter
    ? allFacilities.filter((f) => f.state.toUpperCase() === stateFilter)
    : allFacilities;

  return {
    period: { start: periodStart, end: periodEnd },
    facilities,
    stateStats,
    nationalAvgOosRate,
  };
}
