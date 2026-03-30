import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getInsuranceByDot,
} from "@/lib/socrata";
import {
  getCarrierBasics,
  getCarrierProfile,
  extractCarrierRecord,
} from "@/lib/fmcsa";
import { parseBasics } from "@/components/carrier/shared";

const bodySchema = z.object({
  dotNumbers: z
    .array(z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"))
    .min(1, "At least one USDOT number required")
    .max(4, "Maximum 4 carriers allowed"),
});

export type CompareBasicScore = {
  name: string;
  percentile: number;
  totalViolations: number;
  totalInspections: number;
  serious: number;
  rdDeficient: boolean;
  code: string;
};

export type CompareOosRates = {
  vehicleOosRate: number;
  driverOosRate: number;
  hazmatOosRate: number;
  totalInspections: number;
};

export type CompareInsurance = {
  hasActiveInsurance: boolean;
  insurerName: string | null;
  coverageAmount: string | null;
};

export type CompareCarrier = {
  dotNumber: string;
  legalName: string;
  dbaName: string | null;
  statusCode: string | null;
  powerUnits: number;
  drivers: number;
  operationClassification: string | null;
  carrierOperation: string | null;
  phyCity: string | null;
  phyState: string | null;
  safetyRating: string | null;
  allowedToOperate: string | null;
  basicScores: CompareBasicScore[];
  oosRates: CompareOosRates;
  insurance: CompareInsurance;
  riskRating: { score: number; grade: "A" | "B" | "C" | "D" | "F" };
};

export type ComparePayload = {
  carriers: CompareCarrier[];
  errors: { dotNumber: string; message: string }[];
};

function computeOosRates(
  inspections: { vehicle_oos_total?: string; driver_oos_total?: string; hazmat_oos_total?: string }[]
): CompareOosRates {
  const total = inspections.length;
  if (total === 0) {
    return { vehicleOosRate: 0, driverOosRate: 0, hazmatOosRate: 0, totalInspections: 0 };
  }

  let vehicleOos = 0;
  let driverOos = 0;
  let hazmatOos = 0;

  for (const insp of inspections) {
    if (parseInt(insp.vehicle_oos_total ?? "0", 10) > 0) vehicleOos++;
    if (parseInt(insp.driver_oos_total ?? "0", 10) > 0) driverOos++;
    if (parseInt(insp.hazmat_oos_total ?? "0", 10) > 0) hazmatOos++;
  }

  return {
    vehicleOosRate: Math.round((vehicleOos / total) * 1000) / 10,
    driverOosRate: Math.round((driverOos / total) * 1000) / 10,
    hazmatOosRate: Math.round((hazmatOos / total) * 1000) / 10,
    totalInspections: total,
  };
}

function computeRiskRating(
  carrier: { status_code?: string },
  basicScores: CompareBasicScore[],
  oosRates: CompareOosRates,
  allowedToOperate: string | null
): { score: number; grade: "A" | "B" | "C" | "D" | "F" } {
  let score = 100;

  // Deduct for inactive status
  if (carrier.status_code !== "A") score -= 30;
  if (allowedToOperate === "N") score -= 20;

  // Deduct for high BASIC percentiles
  for (const basic of basicScores) {
    if (basic.percentile >= 75) score -= 8;
    else if (basic.percentile >= 50) score -= 3;
    if (basic.rdDeficient) score -= 5;
  }

  // Deduct for OOS rates
  if (oosRates.vehicleOosRate > 30) score -= 15;
  else if (oosRates.vehicleOosRate > 20) score -= 8;
  else if (oosRates.vehicleOosRate > 10) score -= 3;

  if (oosRates.driverOosRate > 10) score -= 10;
  else if (oosRates.driverOosRate > 5) score -= 5;

  score = Math.max(0, Math.min(100, score));

  let grade: "A" | "B" | "C" | "D" | "F";
  if (score >= 85) grade = "A";
  else if (score >= 70) grade = "B";
  else if (score >= 55) grade = "C";
  else if (score >= 40) grade = "D";
  else grade = "F";

  return { score, grade };
}

async function fetchCarrierData(dotNumber: string): Promise<CompareCarrier> {
  const dot = parseInt(dotNumber, 10);

  const [carrier, inspections, insuranceRecords, basics, profile] =
    await Promise.all([
      getCarrierByDot(dot),
      getInspectionsByDot(dot, 200).catch(() => []),
      getInsuranceByDot(dot, 10).catch(() => []),
      getCarrierBasics(dotNumber).catch(() => null),
      getCarrierProfile(dotNumber).catch(() => null),
    ]);

  if (!carrier) {
    throw new Error(`Carrier not found for USDOT ${dotNumber}`);
  }

  // Extract profile data
  let safetyRating: string | null = null;
  let allowedToOperate: string | null = null;
  const carrierRecord = extractCarrierRecord(profile);
  if (carrierRecord) {
    const rating = carrierRecord.safetyRating ?? carrierRecord.safety_rating;
    if (rating && typeof rating === "string" && rating !== "None") {
      safetyRating = rating;
    }
    if (typeof carrierRecord.allowedToOperate === "string") {
      allowedToOperate = carrierRecord.allowedToOperate;
    }
  }

  // Parse BASIC scores
  const parsedBasics = parseBasics(basics);
  const basicScores: CompareBasicScore[] = parsedBasics.map((b) => ({
    name: b.name,
    percentile: b.percentile,
    totalViolations: b.totalViolations,
    totalInspections: b.totalInspections,
    serious: b.serious,
    rdDeficient: b.rdDeficient,
    code: b.code,
  }));

  // Compute OOS rates
  const oosRates = computeOosRates(inspections);

  // Insurance info
  const activeInsurance = insuranceRecords.find(
    (ins) => ins.ins_form_code && ins.name_company
  );
  const insurance: CompareInsurance = {
    hasActiveInsurance: insuranceRecords.length > 0,
    insurerName: activeInsurance?.name_company ?? null,
    coverageAmount: activeInsurance?.max_cov_amount ?? null,
  };

  // Risk rating
  const riskRating = computeRiskRating(carrier, basicScores, oosRates, allowedToOperate);

  return {
    dotNumber: carrier.dot_number,
    legalName: carrier.legal_name,
    dbaName: carrier.dba_name ?? null,
    statusCode: carrier.status_code ?? null,
    powerUnits: parseInt(carrier.power_units ?? "0", 10) || 0,
    drivers: parseInt(carrier.total_drivers ?? "0", 10) || 0,
    operationClassification: carrier.classdef ?? null,
    carrierOperation: carrier.carrier_operation ?? null,
    phyCity: carrier.phy_city ?? null,
    phyState: carrier.phy_state ?? null,
    safetyRating,
    allowedToOperate,
    basicScores,
    oosRates,
    insurance,
    riskRating,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0].message, 400);
  }

  // De-duplicate DOT numbers
  const uniqueDots = [...new Set(parsed.data.dotNumbers)];

  const results = await Promise.allSettled(
    uniqueDots.map((dot) => fetchCarrierData(dot))
  );

  const carriers: CompareCarrier[] = [];
  const errors: { dotNumber: string; message: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      carriers.push(result.value);
    } else {
      errors.push({
        dotNumber: uniqueDots[i],
        message: result.reason?.message || "Failed to fetch carrier data",
      });
    }
  }

  const payload: ComparePayload = { carriers, errors };
  return Response.json(payload);
}
