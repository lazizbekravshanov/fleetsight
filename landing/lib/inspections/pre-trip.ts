import { prisma } from "@/lib/prisma";
import { getViolationInfo } from "@/lib/inspections/violation-codes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PreTripFocusItem = {
  rank: number;
  code: string;
  description: string;
  group: string;
  count: number;
  oosCount: number;
  checkItem: string;
  fixAction: string;
  lastViolationDate: string | null;
  lastViolationLocation: string | null;
};

export type PreTripFocusSheet = {
  vin: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  currentCleanRate: number;
  projectedCleanRate: number;
  focusItems: PreTripFocusItem[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MONTHS = 24;
const TOP_FOCUS_COUNT = 5;
const PROJECTION_TOP_N = 3;

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function generatePreTripFocus(
  vin: string,
  months?: number,
): Promise<PreTripFocusSheet> {
  const lookback = months ?? DEFAULT_MONTHS;
  const periodStart = monthsAgo(lookback);
  const periodEnd = new Date();

  // ---- 1. Fetch all violations for this VIN within the period ------------

  const violations = await prisma.inspectionViolation.findMany({
    where: {
      vinClean: vin,
      inspectionDate: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { inspectionDate: "desc" },
  });

  if (violations.length === 0) {
    return {
      vin,
      dotNumber: null,
      period: { start: toISODate(periodStart), end: toISODate(periodEnd) },
      totalInspections: 0,
      cleanInspections: 0,
      currentCleanRate: 1,
      projectedCleanRate: 1,
      focusItems: [],
    };
  }

  // ---- 2. Determine dotNumber from most recent record --------------------

  const dotNumber = violations[0].dotNumber;

  // ---- 3. Unique inspection IDs and violation-per-inspection mapping -----

  const inspectionIds = new Set<string>();
  const violationsByInspection = new Map<string, Set<string>>();

  for (const v of violations) {
    inspectionIds.add(v.inspectionId);
    let codes = violationsByInspection.get(v.inspectionId);
    if (!codes) {
      codes = new Set<string>();
      violationsByInspection.set(v.inspectionId, codes);
    }
    codes.add(v.violationCode);
  }

  // An inspection is "clean" for this VIN if it appears in the date range
  // but has zero violation rows. We need total inspections (including clean)
  // for the same VIN & period. Inspections with no violations won't appear
  // in InspectionViolation at all, so we query distinct inspectionIds from
  // FmcsaInspection or approximate via the violations table only.
  //
  // Since InspectionViolation only contains rows where a violation exists,
  // clean inspections are those that do NOT appear here. We use
  // FmcsaInspection as the source of truth for total inspections.

  const totalInspectionRecords = await prisma.fmcsaInspection.findMany({
    where: {
      vin,
      inspectionDate: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true },
  });

  const totalInspections = totalInspectionRecords.length || inspectionIds.size;
  const inspectionsWithViolations = inspectionIds.size;
  const cleanInspections = Math.max(totalInspections - inspectionsWithViolations, 0);
  const currentCleanRate =
    totalInspections > 0 ? cleanInspections / totalInspections : 1;

  // ---- 4. Group violations by code --------------------------------------

  type CodeAgg = {
    code: string;
    description: string;
    group: string;
    count: number;
    oosCount: number;
    lastDate: Date;
    lastLocation: string | null;
  };

  const codeMap = new Map<string, CodeAgg>();

  for (const v of violations) {
    const existing = codeMap.get(v.violationCode);
    if (existing) {
      existing.count += 1;
      existing.oosCount += v.oosViolation ? 1 : 0;
      if (v.inspectionDate > existing.lastDate) {
        existing.lastDate = v.inspectionDate;
        existing.lastLocation =
          [v.inspectionFacility, v.inspectionState].filter(Boolean).join(", ") || null;
      }
    } else {
      codeMap.set(v.violationCode, {
        code: v.violationCode,
        description: v.violationDescription ?? "",
        group: v.violationGroup ?? "UNKNOWN",
        count: 1,
        oosCount: v.oosViolation ? 1 : 0,
        lastDate: v.inspectionDate,
        lastLocation:
          [v.inspectionFacility, v.inspectionState].filter(Boolean).join(", ") || null,
      });
    }
  }

  // ---- 5. Sort by count desc and take top N -----------------------------

  const sorted = Array.from(codeMap.values()).sort((a, b) => b.count - a.count);
  const topCodes = sorted.slice(0, TOP_FOCUS_COUNT);

  // ---- 6. Enrich with violation-code reference data ---------------------

  const focusItems: PreTripFocusItem[] = await Promise.all(
    topCodes.map(async (agg, idx) => {
      const info = await getViolationInfo(agg.code);
      return {
        rank: idx + 1,
        code: agg.code,
        description: info?.description ?? agg.description,
        group: info?.group ?? agg.group,
        count: agg.count,
        oosCount: agg.oosCount,
        checkItem: info?.checkItem ?? "Inspect component per FMCSR requirements",
        fixAction: info?.fixAction ?? "Repair or replace defective component before trip",
        lastViolationDate: toISODate(agg.lastDate),
        lastViolationLocation: agg.lastLocation,
      };
    }),
  );

  // ---- 7. Projected clean rate ------------------------------------------
  // Estimate: if the top-3 violation codes were fully eliminated, which
  // inspections that currently have violations would become "clean"?
  // An inspection becomes clean only if ALL of its violation codes are in
  // the eliminated set.

  const eliminatedCodes = new Set(
    sorted.slice(0, PROJECTION_TOP_N).map((c) => c.code),
  );

  let newlyClean = 0;
  for (const [, codes] of violationsByInspection) {
    const allEliminated = Array.from(codes).every((c) => eliminatedCodes.has(c));
    if (allEliminated) {
      newlyClean += 1;
    }
  }

  const projectedCleanInspections = cleanInspections + newlyClean;
  const projectedCleanRate =
    totalInspections > 0 ? projectedCleanInspections / totalInspections : 1;

  // ---- 8. Build response ------------------------------------------------

  return {
    vin,
    dotNumber,
    period: { start: toISODate(periodStart), end: toISODate(periodEnd) },
    totalInspections,
    cleanInspections,
    currentCleanRate: Math.round(currentCleanRate * 10000) / 10000,
    projectedCleanRate: Math.round(projectedCleanRate * 10000) / 10000,
    focusItems,
  };
}
