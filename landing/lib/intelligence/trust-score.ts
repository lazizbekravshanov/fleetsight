/**
 * Carrier Trust Score Engine
 *
 * Computes a 0–100 composite trust score from four weighted components:
 *   Safety (30%) — BASIC percentiles, OOS rates, crash history
 *   Compliance (25%) — MCS-150 recency, insurance, authority status
 *   Fraud (25%) — Shell indicators, VoIP, authority age, shared attributes
 *   Stability (20%) — Authority age, insurance continuity, fleet consistency
 *
 * Higher = more trustworthy. Inverse of risk.
 */

import type { SocrataInspection, SocrataCrash, SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";

/** Minimal BASIC score shape used by intelligence modules */
export type IntelBasicScore = { basicsId: number; basicsDescription: string; percentile: number };

export type TrustInput = {
  basicScores: IntelBasicScore[];
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  mcs150Date?: string;
  addDate?: string;
  powerUnits?: number;
  totalDrivers?: number;
  statusCode?: string;
  isHazmat?: boolean;
  isVoip?: boolean;
  sosMatchQuality?: "exact" | "partial" | "none";
  sharedAddressCount?: number;
  sharedVinCount?: number;
  sharedPrincipalCount?: number;
};

export type TrustComponent = {
  name: string;
  score: number;
  weight: number;
  weighted: number;
  details: string[];
};

export type TrustResult = {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  components: TrustComponent[];
};

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function computeSafety(input: TrustInput): TrustComponent {
  let score = 100;
  const details: string[] = [];

  const above75 = input.basicScores.filter((s) => s.percentile > 75);
  const above50 = input.basicScores.filter((s) => s.percentile > 50 && s.percentile <= 75);
  if (above75.length > 0) {
    const p = above75.length * 12;
    score -= p;
    details.push(`${above75.length} BASIC categor${above75.length > 1 ? "ies" : "y"} above 75th percentile (-${p})`);
  }
  if (above50.length > 0) {
    const p = above50.length * 4;
    score -= p;
    details.push(`${above50.length} BASIC categor${above50.length > 1 ? "ies" : "y"} between 50th-75th (-${p})`);
  }

  const inspCount = input.inspections.length;
  if (inspCount > 0) {
    const oosCount = input.inspections.filter((i) => parseInt(i.oos_total ?? "0", 10) > 0).length;
    const oosRate = (oosCount / inspCount) * 100;
    if (oosRate > 20) { score -= 25; details.push(`OOS rate ${oosRate.toFixed(1)}% — very high (-25)`); }
    else if (oosRate > 10) { score -= 15; details.push(`OOS rate ${oosRate.toFixed(1)}% — elevated (-15)`); }
    else if (oosRate > 5.5) { score -= 8; details.push(`OOS rate ${oosRate.toFixed(1)}% — above average (-8)`); }
  }

  const fatalities = input.crashes.reduce((s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0), 0);
  const injuries = input.crashes.reduce((s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0), 0);
  if (fatalities > 0) { score -= 20; details.push(`${fatalities} fatal crash${fatalities > 1 ? "es" : ""} (-20)`); }
  if (injuries > 3) { score -= 10; details.push(`${injuries} injuries (-10)`); }
  else if (injuries > 0) { score -= 5; details.push(`${injuries} injur${injuries > 1 ? "ies" : "y"} (-5)`); }
  if (input.crashes.length > 5) { score -= 8; details.push(`${input.crashes.length} total crashes (-8)`); }

  if (details.length === 0) details.push("Clean safety record");
  return { name: "Safety", score: clamp(score), weight: 30, weighted: clamp(score) * 0.3, details };
}

function computeCompliance(input: TrustInput): TrustComponent {
  let score = 100;
  const details: string[] = [];

  if (input.mcs150Date) {
    const months = (Date.now() - new Date(input.mcs150Date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months > 36) { score -= 25; details.push(`MCS-150 ${Math.round(months)} months stale (-25)`); }
    else if (months > 24) { score -= 15; details.push(`MCS-150 ${Math.round(months)} months stale (-15)`); }
    else if (months > 12) { score -= 5; details.push(`MCS-150 updated ${Math.round(months)} months ago (-5)`); }
  } else { score -= 20; details.push("No MCS-150 date on file (-20)"); }

  const bipdPolicies = input.insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  if (bipdPolicies.length === 0) { score -= 30; details.push("No BIPD insurance on file (-30)"); }
  else {
    const minReq = input.isHazmat ? 5000000 : 750000;
    const maxCov = Math.max(...bipdPolicies.map((i) => parseInt(i.max_cov_amount ?? "0", 10) || 0));
    if (maxCov > 0 && maxCov < minReq) { score -= 20; details.push(`Insurance $${maxCov.toLocaleString()} below required (-20)`); }
    else if (maxCov === 750000 && !input.isHazmat) { score -= 3; details.push("Insurance at exact minimum (-3)"); }
  }

  if (input.statusCode && input.statusCode !== "A") { score -= 25; details.push("Carrier not active (-25)"); }

  const revocations = input.authorityHistory.filter((h) => (h.disp_action_desc ?? "").toUpperCase().includes("REVOK"));
  if (revocations.length > 0) {
    const p = Math.min(20, revocations.length * 8);
    score -= p;
    details.push(`${revocations.length} revocation${revocations.length > 1 ? "s" : ""} (-${p})`);
  }

  if (details.length === 0) details.push("Full compliance");
  return { name: "Compliance", score: clamp(score), weight: 25, weighted: clamp(score) * 0.25, details };
}

function computeFraud(input: TrustInput): TrustComponent {
  let score = 100;
  const details: string[] = [];

  if (input.addDate) {
    const days = (Date.now() - new Date(input.addDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 90) { score -= 20; details.push(`Authority ${Math.round(days)} days old (-20)`); }
    else if (days < 180) { score -= 10; details.push(`Authority ${Math.round(days)} days old (-10)`); }
    else if (days < 365) { score -= 5; details.push("Authority under 1 year (-5)"); }
  }

  if (input.powerUnits === 0 && input.totalDrivers === 0) { score -= 25; details.push("Zero units and drivers — shell indicator (-25)"); }
  else if (input.totalDrivers === 0) { score -= 10; details.push("Zero drivers on file (-10)"); }

  if (input.isVoip) { score -= 8; details.push("VoIP phone detected (-8)"); }
  if (input.sosMatchQuality === "none") { score -= 10; details.push("No SoS registration found (-10)"); }
  if (input.sharedAddressCount && input.sharedAddressCount >= 3) { score -= 12; details.push(`Address shared with ${input.sharedAddressCount} carriers (-12)`); }
  if (input.sharedVinCount && input.sharedVinCount >= 1) { score -= 10; details.push(`${input.sharedVinCount} shared VIN${input.sharedVinCount > 1 ? "s" : ""} (-10)`); }

  if (details.length === 0) details.push("No fraud indicators");
  return { name: "Fraud", score: clamp(score), weight: 25, weighted: clamp(score) * 0.25, details };
}

function computeStability(input: TrustInput): TrustComponent {
  let score = 100;
  const details: string[] = [];

  if (input.addDate) {
    const years = (Date.now() - new Date(input.addDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years >= 10) { details.push(`${Math.round(years)} years of history`); }
    else if (years >= 5) { score -= 5; details.push(`${Math.round(years)} years of history (-5)`); }
    else if (years >= 2) { score -= 10; details.push(`${years.toFixed(1)} years of history (-10)`); }
    else if (years >= 1) { score -= 20; details.push(`${years.toFixed(1)} year of history (-20)`); }
    else { score -= 30; details.push("Less than 1 year of history (-30)"); }
  } else { score -= 25; details.push("No authority date (-25)"); }

  if (input.inspections.length === 0) { score -= 15; details.push("No inspections — limited visibility (-15)"); }
  else if (input.inspections.length < 5) { score -= 5; details.push(`Only ${input.inspections.length} inspections (-5)`); }

  if (input.insurance.length > 5) { score -= 8; details.push(`${input.insurance.length} insurance changes (-8)`); }
  if (input.authorityHistory.length > 4) { score -= 10; details.push(`${input.authorityHistory.length} authority changes (-10)`); }

  if (details.length === 0) details.push("Stable history");
  return { name: "Stability", score: clamp(score), weight: 20, weighted: clamp(score) * 0.2, details };
}

export function computeTrustScore(input: TrustInput): TrustResult {
  const safety = computeSafety(input);
  const compliance = computeCompliance(input);
  const fraud = computeFraud(input);
  const stability = computeStability(input);

  const overall = clamp(Math.round(safety.weighted + compliance.weighted + fraud.weighted + stability.weighted));

  return { overall, grade: gradeFromScore(overall), components: [safety, compliance, fraud, stability] };
}
