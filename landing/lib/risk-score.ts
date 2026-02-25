import type { BasicScore, RiskFactor, RiskScore } from "@/components/carrier/types";
import type { SocrataInspection, SocrataCrash, SocrataAuthorityHistory, SocrataInsurance } from "./socrata";

type RiskInput = {
  basicScores: BasicScore[];
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  oosRecords: Record<string, unknown>[];
  authorityHistory: SocrataAuthorityHistory[];
  mcs150Date?: string;
  addDate?: string;
  insurance: SocrataInsurance[];
  powerUnits?: number;
  totalDrivers?: number;
  isHazmat?: boolean;
  isVoip?: boolean;
  sosMatchQuality?: "exact" | "partial" | "none";
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function scoreBASIC(basicScores: BasicScore[]): number {
  const above75 = basicScores.filter((s) => s.percentile > 75).length;
  if (above75 >= 3) return 90;
  if (above75 === 2) return 70;
  if (above75 === 1) return 40;
  return 0;
}

function scoreOOS(inspections: SocrataInspection[]): number {
  const total = inspections.length;
  if (total === 0) return 0;
  const oosCount = inspections.reduce(
    (s, i) => s + (parseInt(i.oos_total ?? "0", 10) > 0 ? 1 : 0),
    0
  );
  const rate = (oosCount / total) * 100;
  if (rate > 20) return 100;
  if (rate > 10) return 75;
  if (rate > 5.5) return 50;
  if (rate > 3) return 20;
  return 0;
}

function scoreCrashSeverity(crashes: SocrataCrash[]): number {
  const fatalities = crashes.reduce(
    (s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0),
    0
  );
  const injuries = crashes.reduce(
    (s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0),
    0
  );
  const tow = crashes.reduce(
    (s, c) => s + (parseInt(c.tow_away ?? "0", 10) || 0),
    0
  );
  const raw = fatalities * 3 + injuries * 2 + tow;
  let score: number;
  if (raw > 15) score = 80;
  else if (raw > 5) score = 60;
  else if (raw >= 1) score = 30;
  else score = 0;
  if (fatalities > 0) score = Math.max(score, 70);
  return score;
}

function scoreAuthority(
  oosRecords: Record<string, unknown>[],
  authorityHistory: SocrataAuthorityHistory[]
): number {
  if (oosRecords.length > 0) return 100;
  const revocations = authorityHistory.filter(
    (h) => (h.disp_action_desc ?? "").toUpperCase().includes("REVOK")
  );
  if (revocations.length >= 3) return 80;
  if (revocations.length === 2) return 60;
  if (revocations.length === 1) return 30;
  return 0;
}

function scoreMCS150(mcs150Date?: string): number {
  if (!mcs150Date) return 100;
  const date = new Date(mcs150Date);
  if (isNaN(date.getTime())) return 100;
  const months = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months > 36) return 100;
  if (months > 24) return 60;
  if (months > 12) return 20;
  return 0;
}

function scoreInsurance(insurance: SocrataInsurance[], isHazmat?: boolean): number {
  const bipd = insurance.filter(
    (i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD")
  );
  if (bipd.length === 0) return 100;
  const minRequired = isHazmat ? 5000000 : 750000;
  const maxCoverage = Math.max(
    ...bipd.map((i) => parseInt(i.max_cov_amount ?? "0", 10) || 0)
  );
  if (maxCoverage < minRequired && maxCoverage > 0) return 70;
  return 0;
}

function scoreShell(
  powerUnits?: number,
  totalDrivers?: number,
  isVoip?: boolean,
  sosMatchQuality?: "exact" | "partial" | "none"
): number {
  let score = 0;
  if (
    powerUnits !== undefined &&
    totalDrivers !== undefined &&
    powerUnits === 0 &&
    totalDrivers === 0
  ) {
    score = 100;
  } else if (totalDrivers === 0) {
    score = 60;
  }
  if (isVoip) score = Math.min(100, score + 15);
  if (sosMatchQuality === "none") score = Math.min(100, score + 10);
  return score;
}

function severity(value: number): "critical" | "elevated" | "low" {
  if (value >= 60) return "critical";
  if (value >= 30) return "elevated";
  return "low";
}

function grade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score <= 20) return "A";
  if (score <= 40) return "B";
  if (score <= 60) return "C";
  if (score <= 80) return "D";
  return "F";
}

export function computeRiskScore(input: RiskInput): RiskScore {
  const basicVal = scoreBASIC(input.basicScores);
  const oosVal = scoreOOS(input.inspections);
  const crashVal = scoreCrashSeverity(input.crashes);
  const authVal = scoreAuthority(input.oosRecords, input.authorityHistory);
  const mcs150Val = scoreMCS150(input.mcs150Date);
  const insVal = scoreInsurance(input.insurance, input.isHazmat);
  const shellVal = scoreShell(
    input.powerUnits,
    input.totalDrivers,
    input.isVoip,
    input.sosMatchQuality
  );

  // Apply suspicious contact penalty
  let mcs150Adjusted = mcs150Val;
  if (input.mcs150Date && input.addDate) {
    const mcsDate = new Date(input.mcs150Date);
    const addDate = new Date(input.addDate);
    const mcsMonths = (Date.now() - mcsDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const authDays = (Date.now() - addDate.getTime()) / (1000 * 60 * 60 * 24);
    if (mcsMonths > 24 && authDays < 180) {
      mcs150Adjusted = Math.min(100, mcs150Val + 20);
    }
  }

  const weights = [
    { cat: "BASIC Percentiles", weight: 25, value: basicVal },
    { cat: "OOS Rate", weight: 15, value: oosVal },
    { cat: "Crash Severity", weight: 20, value: crashVal },
    { cat: "Authority Status", weight: 15, value: authVal },
    { cat: "MCS-150 Staleness", weight: 10, value: mcs150Adjusted },
    { cat: "Insurance Compliance", weight: 10, value: insVal },
    { cat: "Shell Indicators", weight: 5, value: shellVal },
  ];

  const factors: RiskFactor[] = weights.map((w) => {
    const weighted = (w.value * w.weight) / 100;
    return {
      category: w.cat,
      label: w.cat,
      value: w.value,
      weight: w.weight,
      weightedScore: Math.round(weighted * 10) / 10,
      severity: severity(w.value),
      detail: describeScore(w.cat, w.value),
    };
  });

  const rawScore = factors.reduce((s, f) => s + f.weightedScore, 0);
  const finalScore = clamp(Math.round(rawScore));

  return {
    score: finalScore,
    grade: grade(finalScore),
    factors,
  };
}

function describeScore(category: string, value: number): string {
  if (value === 0) return "No concerns detected";
  const level =
    value >= 80 ? "Critical" : value >= 60 ? "High" : value >= 30 ? "Moderate" : "Minor";
  switch (category) {
    case "BASIC Percentiles":
      return `${level}: BASIC scores above intervention thresholds`;
    case "OOS Rate":
      return `${level}: Out-of-service rate exceeds expected levels`;
    case "Crash Severity":
      return `${level}: Crash history indicates elevated risk`;
    case "Authority Status":
      return `${level}: Authority issues detected`;
    case "MCS-150 Staleness":
      return `${level}: MCS-150 filing is overdue`;
    case "Insurance Compliance":
      return `${level}: Insurance coverage concerns`;
    case "Shell Indicators":
      return `${level}: Possible shell company indicators`;
    default:
      return `${level} risk detected`;
  }
}

/** Lightweight risk score for search results — uses only census fields */
export function computeQuickRiskIndicator(carrier: {
  powerUnits?: number;
  totalDrivers?: number;
  addDate?: string;
  mcs150Date?: string;
  statusCode?: string;
}): { grade: "A" | "B" | "C" | "D" | "F"; score: number } {
  let score = 0;

  // Shell check
  if (carrier.powerUnits === 0 && carrier.totalDrivers === 0) score += 25;
  else if (carrier.totalDrivers === 0) score += 10;

  // MCS-150 staleness
  if (carrier.mcs150Date) {
    const months =
      (Date.now() - new Date(carrier.mcs150Date).getTime()) /
      (1000 * 60 * 60 * 24 * 30.44);
    if (months > 36) score += 20;
    else if (months > 24) score += 10;
  }

  // Authority age
  if (carrier.addDate) {
    const days =
      (Date.now() - new Date(carrier.addDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 90) score += 15;
    else if (days < 180) score += 5;
  }

  // Inactive status
  if (carrier.statusCode && carrier.statusCode !== "A") score += 20;

  const clamped = clamp(score);
  return { grade: grade(clamped), score: clamped };
}
