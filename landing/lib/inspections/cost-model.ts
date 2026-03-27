import { prisma } from "@/lib/prisma";
import { getViolationInfo } from "@/lib/inspections/violation-codes";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CostModelInputs = {
  avgTowCost?: number; // default 500
  avgRepairCost?: number; // default 800
  avgDelayHours?: number; // default 8
  revenuePerMile?: number; // default 2.50
  avgDailyMiles?: number; // default 500
};

export type ViolationCostBreakdown = {
  code: string;
  description: string;
  oosCount: number;
  estimatedDirectCost: number;
  estimatedRevenueLost: number;
  estimatedTotal: number;
};

export type CostImpactReport = {
  dotNumber: number;
  period: { start: string; end: string };
  inputs: Required<CostModelInputs>;
  dailyRevenuePerTruck: number;

  // Annual impact
  annualOOSEvents: number;
  annualDirectCost: number;
  annualRevenueLost: number;
  estimatedInsurancePremiumIncrease: number;
  totalAnnualImpact: number;

  // If fixed
  projectedOOSEventsIfFixed: number;
  projectedAnnualSavings: number;
  projectedInsuranceSavings: number;
  totalProjectedSavings: number;

  // Breakdown
  topCostlyViolations: ViolationCostBreakdown[];

  // Actions
  topActions: { action: string; eliminates: number; savings: number }[];
};

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULTS: Required<CostModelInputs> = {
  avgTowCost: 500,
  avgRepairCost: 800,
  avgDelayHours: 8,
  revenuePerMile: 2.5,
  avgDailyMiles: 500,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveInputs(custom?: CostModelInputs): Required<CostModelInputs> {
  return {
    avgTowCost: custom?.avgTowCost ?? DEFAULTS.avgTowCost,
    avgRepairCost: custom?.avgRepairCost ?? DEFAULTS.avgRepairCost,
    avgDelayHours: custom?.avgDelayHours ?? DEFAULTS.avgDelayHours,
    revenuePerMile: custom?.revenuePerMile ?? DEFAULTS.revenuePerMile,
    avgDailyMiles: custom?.avgDailyMiles ?? DEFAULTS.avgDailyMiles,
  };
}

/**
 * Estimate insurance premium increase percentage based on OOS rate.
 */
function insurancePremiumIncreasePct(oosRate: number): number {
  if (oosRate > 0.2) return 0.4;
  if (oosRate > 0.1) return 0.25;
  if (oosRate > 0.05) return 0.15;
  return 0.05;
}

/* ------------------------------------------------------------------ */
/*  Main function                                                      */
/* ------------------------------------------------------------------ */

export async function generateCostImpact(
  dotNumber: number,
  customInputs?: CostModelInputs,
  months: number = 12,
): Promise<CostImpactReport> {
  const inputs = resolveInputs(customInputs);
  const dailyRevenuePerTruck = inputs.revenuePerMile * inputs.avgDailyMiles;

  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - months);

  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = now.toISOString().slice(0, 10);

  /* ---- Fetch all violations in the period ---- */

  const violations = await prisma.inspectionViolation.findMany({
    where: {
      dotNumber,
      inspectionDate: { gte: start, lte: now },
    },
    select: {
      inspectionId: true,
      violationCode: true,
      violationDescription: true,
      oosViolation: true,
    },
  });

  /* ---- Distinct inspections & OOS inspections ---- */

  const inspectionMap = new Map<
    string,
    { hasOos: boolean; oosCodes: Set<string> }
  >();

  for (const v of violations) {
    let entry = inspectionMap.get(v.inspectionId);
    if (!entry) {
      entry = { hasOos: false, oosCodes: new Set() };
      inspectionMap.set(v.inspectionId, entry);
    }
    if (v.oosViolation) {
      entry.hasOos = true;
      entry.oosCodes.add(v.violationCode);
    }
  }

  const totalInspections = inspectionMap.size;
  const oosInspectionIds = new Set<string>();
  for (const [id, entry] of inspectionMap) {
    if (entry.hasOos) oosInspectionIds.add(id);
  }
  const annualOOSEvents = oosInspectionIds.size;

  const oosRate = totalInspections > 0 ? annualOOSEvents / totalInspections : 0;

  /* ---- Annual cost calculations ---- */

  const directCostPerOOS = inputs.avgTowCost + inputs.avgRepairCost;
  const revenueLostPerOOS = (inputs.avgDelayHours / 24) * dailyRevenuePerTruck;

  const annualDirectCost = annualOOSEvents * directCostPerOOS;
  const annualRevenueLost = annualOOSEvents * revenueLostPerOOS;

  // Use a reasonable baseline annual insurance cost per truck for estimation.
  // We assume ~$12,000 annual premium as a baseline reference figure.
  const baselineInsurancePremium = 12_000;
  const insurancePct = insurancePremiumIncreasePct(oosRate);
  const estimatedInsurancePremiumIncrease = Math.round(
    baselineInsurancePremium * insurancePct,
  );

  const totalAnnualImpact =
    annualDirectCost + annualRevenueLost + estimatedInsurancePremiumIncrease;

  /* ---- Violation code OOS counts ---- */

  const codeOosCount = new Map<string, number>();
  const codeDescription = new Map<string, string>();

  for (const v of violations) {
    if (!v.oosViolation) continue;

    codeOosCount.set(
      v.violationCode,
      (codeOosCount.get(v.violationCode) ?? 0) + 1,
    );
    if (v.violationDescription && !codeDescription.has(v.violationCode)) {
      codeDescription.set(v.violationCode, v.violationDescription);
    }
  }

  const sortedCodes = [...codeOosCount.entries()].sort(
    ([, a], [, b]) => b - a,
  );

  /* ---- "If fixed" projection ---- */

  // Take top 3 violation codes by OOS count
  const top3Codes = new Set(sortedCodes.slice(0, 3).map(([code]) => code));

  // Count inspections where ALL OOS violations are in the top 3 codes
  let eliminatedOOSEvents = 0;
  for (const inspId of oosInspectionIds) {
    const entry = inspectionMap.get(inspId)!;
    const allInTop3 = [...entry.oosCodes].every((c) => top3Codes.has(c));
    if (allInTop3) eliminatedOOSEvents++;
  }

  const projectedOOSEventsIfFixed = annualOOSEvents - eliminatedOOSEvents;
  const projectedOosRate =
    totalInspections > 0
      ? projectedOOSEventsIfFixed / totalInspections
      : 0;
  const projectedInsurancePct = insurancePremiumIncreasePct(projectedOosRate);
  const projectedInsuranceCost = Math.round(
    baselineInsurancePremium * projectedInsurancePct,
  );
  const projectedInsuranceSavings =
    estimatedInsurancePremiumIncrease - projectedInsuranceCost;

  const projectedAnnualSavings =
    eliminatedOOSEvents * (directCostPerOOS + revenueLostPerOOS);

  const totalProjectedSavings =
    projectedAnnualSavings + projectedInsuranceSavings;

  /* ---- Top 5 costly violations breakdown ---- */

  const topCostlyViolations: ViolationCostBreakdown[] = sortedCodes
    .slice(0, 5)
    .map(([code, oosCount]) => {
      const estimatedDirectCost = oosCount * directCostPerOOS;
      const estimatedRevenueLost = oosCount * revenueLostPerOOS;
      return {
        code,
        description: codeDescription.get(code) ?? code,
        oosCount,
        estimatedDirectCost,
        estimatedRevenueLost,
        estimatedTotal: estimatedDirectCost + estimatedRevenueLost,
      };
    });

  /* ---- Top actions using violation code metadata ---- */

  const top3CodesList = sortedCodes.slice(0, 3).map(([code]) => code);
  const topActions: { action: string; eliminates: number; savings: number }[] =
    [];

  for (const code of top3CodesList) {
    const info = await getViolationInfo(code);

    // Count how many OOS inspections this single code would eliminate
    // (inspections where this is the ONLY OOS code)
    let eliminatesCount = 0;
    for (const inspId of oosInspectionIds) {
      const entry = inspectionMap.get(inspId)!;
      if (entry.oosCodes.size === 1 && entry.oosCodes.has(code)) {
        eliminatesCount++;
      }
    }

    // At minimum, the code contributes to the OOS count proportionally
    const codeCount = codeOosCount.get(code) ?? 0;
    const savings = codeCount * (directCostPerOOS + revenueLostPerOOS);

    const action =
      info?.fixAction ??
      `Address violation ${code}: ${codeDescription.get(code) ?? "Unknown violation"}`;

    topActions.push({
      action,
      eliminates: eliminatesCount,
      savings: Math.round(savings),
    });
  }

  return {
    dotNumber,
    period: { start: periodStart, end: periodEnd },
    inputs,
    dailyRevenuePerTruck,

    annualOOSEvents,
    annualDirectCost,
    annualRevenueLost,
    estimatedInsurancePremiumIncrease,
    totalAnnualImpact,

    projectedOOSEventsIfFixed,
    projectedAnnualSavings: Math.round(projectedAnnualSavings),
    projectedInsuranceSavings,
    totalProjectedSavings: Math.round(totalProjectedSavings),

    topCostlyViolations,
    topActions,
  };
}
