/**
 * Full carrier intelligence page — SAFER + SMS + 7 killer features.
 *
 * Replicates FMCSA SAFER Company Snapshot and SMS Safety Measurement System,
 * plus compliance scoring, fraud detection, entity graph, timeline, predecessor
 * chain, enabler risk, and driver migration.
 *
 * All data from 11+ sources fetched in parallel. No tabs. No dashboard.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
  getViolationsByDot,
  type SocrataCarrier,
  type SocrataInspection,
  type SocrataCrash,
  type SocrataInsurance,
  type SocrataAuthorityHistory,
  type SocrataViolation,
} from "@/lib/socrata";
import {
  getCarrierBasics, getCarrierProfile, extractCarrierRecord,
  getCarrierCargoCarried, getCarrierOperationClassification, getCarrierDocketNumbers,
} from "@/lib/fmcsa";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { computeAllSignals } from "@/lib/detection-signals";
import { checkVoipIndicators } from "@/lib/voip-check";
import {
  decodeStatus, entityTypeBadge, decodeOperation, decodeCarship,
  decodeFleetSize, decodeInspectionLevel, CARSHIP_CODES,
  CARRIER_OPERATION_CODES,
} from "@/lib/fmcsa-codes";
import { parseBasics, extractArray } from "@/components/carrier/shared";
import type { BasicScore } from "@/components/carrier/types";
import { prisma } from "@/lib/prisma";
import { NetworkGraph } from "@/components/carrier/network-graph";
import { EnablerRisk } from "@/components/carrier/enabler-risk";
import { ViolationDrillDown, type InspectionWithViolations, type ViolationRow } from "@/components/carrier/violation-drill-down";

type Props = { params: { dotNumber: string } };
export const revalidate = 86400;

/* ── Metadata ────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dot = params.dotNumber;
  if (!/^\d{1,10}$/.test(dot)) return { title: "Carrier Not Found | FleetSight" };
  const carrier = await getCarrierByDot(parseInt(dot, 10));
  if (!carrier) return { title: "Carrier Not Found | FleetSight" };
  return {
    title: `${carrier.legal_name} — DOT ${dot} | FleetSight`,
    description: `Full SAFER + SMS intelligence for ${carrier.legal_name} (USDOT ${dot}). BASIC scores, inspections, violations, crashes, insurance, authority, fraud signals.`,
  };
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function p(s: string | undefined): number { if (!s) return 0; const n = parseInt(s, 10); return Number.isFinite(n) ? n : 0; }

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtCurrency(v: string | number | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return !Number.isFinite(n) ? "—" : "$" + n.toLocaleString("en-US");
}

function settled<T>(r: PromiseSettledResult<T>, fb: T): T { return r.status === "fulfilled" ? r.value : fb; }

type Verdict = "pass" | "watch" | "fail";
const VC: Record<Verdict, { border: string; bg: string; fg: string; label: string }> = {
  pass: { border: "#16a34a", bg: "rgba(22,163,74,0.10)", fg: "#15803d", label: "PASS" },
  watch: { border: "#d97757", bg: "rgba(217,119,87,0.10)", fg: "#9a3412", label: "WATCH" },
  fail: { border: "#dc2626", bg: "rgba(220,38,38,0.10)", fg: "#991b1b", label: "FAIL" },
};
const SC: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "rgba(220,38,38,0.12)", fg: "#991b1b" },
  high: { bg: "rgba(217,119,87,0.14)", fg: "#9a3412" },
  medium: { bg: "rgba(202,138,4,0.12)", fg: "#854d0e" },
  low: { bg: "rgba(100,116,139,0.12)", fg: "#475569" },
};

const NATIONAL_AVG = { vehicleOos: 20.72, driverOos: 5.51, hazmatOos: 4.50 };

/* ── SAFER Inspection Summary (Gap 2) ────────────────────────────── */

function computeSaferInspectionSummary(inspections: SocrataInspection[]) {
  let vehicleInsp = 0, vehicleOos = 0, driverInsp = 0, driverOos = 0, hazmatInsp = 0, hazmatOos = 0;
  for (const i of inspections) {
    const lvl = p(i.insp_level_id);
    // Vehicle: levels 1,2,5,6
    if ([1, 2, 5, 6].includes(lvl)) { vehicleInsp++; if (p(i.vehicle_oos_total) > 0) vehicleOos++; }
    // Driver: levels 1,2,3,6
    if ([1, 2, 3, 6].includes(lvl)) { driverInsp++; if (p(i.driver_oos_total) > 0) driverOos++; }
    // Hazmat: any level with hazmat violations
    if (p(i.hazmat_viol_total) > 0 || p(i.hazmat_oos_total) > 0) { hazmatInsp++; if (p(i.hazmat_oos_total) > 0) hazmatOos++; }
  }
  return {
    vehicle: { insp: vehicleInsp, oos: vehicleOos, pct: vehicleInsp > 0 ? (vehicleOos / vehicleInsp * 100) : 0 },
    driver: { insp: driverInsp, oos: driverOos, pct: driverInsp > 0 ? (driverOos / driverInsp * 100) : 0 },
    hazmat: { insp: hazmatInsp, oos: hazmatOos, pct: hazmatInsp > 0 ? (hazmatOos / hazmatInsp * 100) : 0 },
  };
}

/* ── SAFER Crash Summary (Gap 3) ─────────────────────────────────── */

function computeSaferCrashSummary(crashes: SocrataCrash[]) {
  let fatal = 0, injury = 0, tow = 0;
  for (const c of crashes) {
    if (p(c.fatalities) > 0) fatal++;
    else if (p(c.injuries) > 0) injury++;
    else if (p(c.tow_away) > 0) tow++;
  }
  return { fatal, injury, tow, total: fatal + injury + tow };
}

/* ── ISS Priority Score (Gap 6) ──────────────────────────────────── */

function computeIssScore(basics: BasicScore[]): number {
  if (basics.length === 0) return 0;
  let score = 0;
  for (const b of basics) {
    if (b.percentile >= 75) score += b.percentile * 0.15;
    else if (b.percentile >= 50) score += b.percentile * 0.05;
  }
  return Math.min(100, Math.max(1, Math.round(score)));
}

/* ── Top Violations (Gap 8) ──────────────────────────────────────── */

type TopViolation = { code: string; desc: string; count: number; oosCount: number; basic: string };

function computeTopViolations(violations: SocrataViolation[], limit = 10): TopViolation[] {
  const map = new Map<string, TopViolation>();
  for (const v of violations) {
    const code = v.viol_code ?? "?";
    const existing = map.get(code);
    if (existing) {
      existing.count++;
      if (v.oos === "Y") existing.oosCount++;
    } else {
      map.set(code, { code, desc: v.viol_desc ?? code, count: 1, oosCount: v.oos === "Y" ? 1 : 0, basic: v.basic ?? "" });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

/* ── Predecessor Chain ───────────────────────────────────────────── */

async function fetchPredecessorChain(carrier: SocrataCarrier, maxDepth = 5): Promise<SocrataCarrier[]> {
  const chain: SocrataCarrier[] = [];
  let current = carrier;
  const seen = new Set<string>([current.dot_number]);
  for (let i = 0; i < maxDepth; i++) {
    if (current.prior_revoke_flag !== "Y" || !current.prior_revoke_dot) break;
    if (seen.has(current.prior_revoke_dot)) break;
    seen.add(current.prior_revoke_dot);
    const prior = await getCarrierByDot(parseInt(current.prior_revoke_dot, 10)).catch(() => null);
    if (!prior) break;
    chain.push(prior);
    current = prior;
  }
  return chain;
}

/* ── Compliance Score ────────────────────────────────────────────── */

type Check = { label: string; status: "pass" | "warn" | "fail"; detail: string };

function computeCompliance(
  carrier: SocrataCarrier, insurance: SocrataInsurance[], authorityHistory: SocrataAuthorityHistory[],
  basics: BasicScore[], inspections: SocrataInspection[], crashes: SocrataCrash[],
  signals: { anomalyFlags: { severity: string }[] }, voip: { isLikelyVoip: boolean },
  fmcsaRecord: Record<string, unknown> | null,
): Check[] {
  const checks: Check[] = [];
  const now = Date.now();
  checks.push({ label: "Active USDOT", status: carrier.status_code === "A" ? "pass" : "fail", detail: carrier.status_code === "A" ? "Active" : decodeStatus(carrier.status_code) });
  const hasAuth = authorityHistory.some((a) => a.original_action_desc === "GRANTED" && !a.disp_action_desc);
  checks.push({ label: "Active Authority", status: hasAuth ? "pass" : authorityHistory.length > 0 ? "fail" : "warn", detail: hasAuth ? "Active authority on file" : "No active authority found" });
  const bipd = insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  const recentBipd = bipd.some((i) => i.effective_date && now - new Date(i.effective_date).getTime() < 365 * 86400000);
  checks.push({ label: "Current BIPD", status: recentBipd ? "pass" : bipd.length > 0 ? "warn" : "fail", detail: recentBipd ? "Within 12 months" : bipd.length > 0 ? "May be stale" : "No BIPD filed" });
  const isHaz = carrier.hm_ind === "Y"; const minCov = isHaz ? 5000000 : 750000;
  const maxCov = Math.max(...bipd.map((i) => p(i.max_cov_amount) || p(i.underl_lim_amount)), 0);
  checks.push({ label: "Adequate Coverage", status: maxCov >= minCov ? "pass" : maxCov > 0 ? "warn" : "fail", detail: maxCov >= minCov ? `${fmtCurrency(maxCov)} meets minimum` : maxCov > 0 ? `${fmtCurrency(maxCov)} below ${fmtCurrency(minCov)}` : "No coverage" });
  const mcsAge = carrier.mcs150_date ? (now - new Date(carrier.mcs150_date).getTime()) / (86400000 * 30.44) : Infinity;
  checks.push({ label: "MCS-150 Current", status: mcsAge <= 24 ? "pass" : mcsAge <= 36 ? "warn" : "fail", detail: mcsAge <= 24 ? fmtDate(carrier.mcs150_date) : "Overdue" });
  const hasOos = carrier.status_code === "OOS" || !!(fmcsaRecord?.oosDate);
  checks.push({ label: "No OOS Order", status: hasOos ? "fail" : "pass", detail: hasOos ? "Active OOS" : "Clear" });
  const alerts = basics.filter((b) => b.rdDeficient).length;
  checks.push({ label: "No BASIC Alerts", status: alerts === 0 ? "pass" : alerts <= 1 ? "warn" : "fail", detail: alerts === 0 ? "None" : `${alerts} alert${alerts > 1 ? "s" : ""}` });
  const tOos = inspections.reduce((s, i) => s + p(i.oos_total), 0);
  const oosR = inspections.length > 0 ? (tOos / inspections.length) * 100 : 0;
  checks.push({ label: "OOS Rate", status: inspections.length === 0 ? "warn" : oosR <= 6 ? "pass" : oosR <= 15 ? "warn" : "fail", detail: inspections.length === 0 ? "No inspections" : `${oosR.toFixed(1)}%` });
  const recentFatal = crashes.filter((c) => c.report_date && now - new Date(c.report_date).getTime() < 730 * 86400000 && p(c.fatalities) > 0).length;
  checks.push({ label: "No Recent Fatals", status: recentFatal === 0 ? "pass" : "fail", detail: recentFatal === 0 ? "None in 24mo" : `${recentFatal} in 24mo` });
  const critHigh = signals.anomalyFlags.filter((f) => f.severity === "critical" || f.severity === "high").length;
  checks.push({ label: "No Chameleon Signals", status: critHigh === 0 ? "pass" : "fail", detail: critHigh === 0 ? "Clean" : `${critHigh} signal${critHigh > 1 ? "s" : ""}` });
  checks.push({ label: "Phone Verified", status: voip.isLikelyVoip ? "warn" : carrier.phone ? "pass" : "warn", detail: voip.isLikelyVoip ? "VoIP" : carrier.phone ? "Non-VoIP" : "No phone" });
  const pu = p(carrier.power_units), dr = p(carrier.total_drivers);
  checks.push({ label: "Fleet-Driver Ratio", status: pu === 0 && dr === 0 ? "fail" : (pu > 0 && dr > 0 && dr / pu >= 0.5 && dr / pu <= 5) ? "pass" : "warn", detail: `${pu} units, ${dr} drivers` });
  return checks;
}

/* ── Timeline ────────────────────────────────────────────────────── */

type TEvent = { date: Date; type: string; sev: "green" | "amber" | "red"; text: string };

function buildTimeline(carrier: SocrataCarrier, insp: SocrataInspection[], crash: SocrataCrash[], ins: SocrataInsurance[], auth: SocrataAuthorityHistory[]): TEvent[] {
  const ev: TEvent[] = [];
  if (carrier.add_date) ev.push({ date: new Date(carrier.add_date), type: "Authority", sev: "green", text: "USDOT registered" });
  if (carrier.mcs150_date) ev.push({ date: new Date(carrier.mcs150_date), type: "MCS-150", sev: "amber", text: "MCS-150 updated" });
  for (const i of insp) { if (!i.insp_date) continue; const oos = p(i.oos_total) > 0; ev.push({ date: new Date(i.insp_date), type: "Inspection", sev: oos ? "red" : p(i.viol_total) > 0 ? "amber" : "green", text: `${oos ? "OOS " : ""}Inspection ${i.report_state ?? ""} — ${i.viol_total ?? 0} viols` }); }
  for (const c of crash) { if (!c.report_date) continue; ev.push({ date: new Date(c.report_date), type: "Crash", sev: "red", text: `Crash ${c.report_state ?? ""}${p(c.fatalities) > 0 ? ` — ${c.fatalities} fatal` : ""}${p(c.injuries) > 0 ? ` — ${c.injuries} injuries` : ""}` }); }
  for (const i of ins) { if (!i.effective_date) continue; ev.push({ date: new Date(i.effective_date), type: "Insurance", sev: "green", text: `${i.mod_col_1 ?? "Insurance"} filed — ${i.name_company ?? ""}` }); }
  for (const a of auth) {
    if (a.orig_served_date) ev.push({ date: new Date(a.orig_served_date), type: "Authority", sev: "green", text: `${a.original_action_desc ?? "Action"}: ${a.mod_col_1 ?? ""}` });
    if (a.disp_served_date && a.disp_action_desc) { const bad = ["REVOKED", "SUSPENDED", "RESCINDED"].includes(a.disp_action_desc.toUpperCase()); ev.push({ date: new Date(a.disp_served_date), type: "Authority", sev: bad ? "red" : "amber", text: `${a.disp_action_desc}: ${a.mod_col_1 ?? ""}` }); }
  }
  return ev.filter((e) => !isNaN(e.date.getTime())).sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ── Insurance Analysis ──────────────────────────────────────────── */

function analyzeInsurance(carrier: SocrataCarrier, insurance: SocrataInsurance[]) {
  const isHaz = carrier.hm_ind === "Y";
  const bipd = insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  const bipdCov = Math.max(...bipd.map((i) => p(i.max_cov_amount) || p(i.underl_lim_amount)), 0);
  const dates = insurance.map((i) => i.effective_date).filter(Boolean).sort();
  const newest = dates.length > 0 ? dates[dates.length - 1] : null;
  const daysSince = newest ? Math.floor((Date.now() - new Date(newest!).getTime()) / 86400000) : null;
  const insurers = [...new Set(insurance.map((i) => i.name_company).filter(Boolean) as string[])];
  return { hasBipd: bipd.length > 0, bipdCov, adequate: bipdCov >= (isHaz ? 5000000 : 750000), isHaz, insurers, daysSince };
}

/* ── Driver Migration ────────────────────────────────────────────── */

type DM = { dotNumber: number; legalName: string | null; statusCode: string | null; sharedDrivers: number };

async function getDriverMigration(dotNumber: number): Promise<DM[]> {
  try {
    const cdls = await prisma.driverObservation.findMany({ where: { dotNumber }, select: { cdlKey: true }, distinct: ["cdlKey"] });
    if (cdls.length === 0) return [];
    const others = await prisma.driverObservation.groupBy({ by: ["dotNumber"], where: { cdlKey: { in: cdls.map((c) => c.cdlKey) }, dotNumber: { not: dotNumber } }, _count: { cdlKey: true } });
    if (others.length === 0) return [];
    const top = others.sort((a, b) => b._count.cdlKey - a._count.cdlKey).slice(0, 10);
    const carriers = await prisma.fmcsaCarrier.findMany({ where: { dotNumber: { in: top.map((o) => o.dotNumber) } }, select: { dotNumber: true, legalName: true, statusCode: true } });
    const cm = new Map(carriers.map((c) => [c.dotNumber, c]));
    return top.map((o) => ({ dotNumber: o.dotNumber, legalName: cm.get(o.dotNumber)?.legalName ?? null, statusCode: cm.get(o.dotNumber)?.statusCode ?? null, sharedDrivers: o._count.cdlKey }));
  } catch { return []; }
}

/* ── Parse FMCSA extended fields ─────────────────────────────────── */

function extractComplaintCount(profile: unknown): number {
  const rec = extractCarrierRecord(profile as Record<string, unknown>);
  return Number(rec?.complaintCount ?? 0) || 0;
}

function extractFleetBreakdown(profile: unknown): Record<string, number> {
  const rec = extractCarrierRecord(profile as Record<string, unknown>);
  if (!rec) return {};
  const fields: Record<string, string> = { "Buses": "busVehicle", "Limousines": "limoVehicle", "Mini-Buses": "miniBusVehicle", "Motorcoaches": "motorCoachVehicle", "Vans": "vanVehicle", "Passenger Vehicles": "passengerVehicle" };
  const result: Record<string, number> = {};
  for (const [label, key] of Object.entries(fields)) {
    const v = Number(rec[key] ?? 0);
    if (v > 0) result[label] = v;
  }
  return result;
}

function extractDockets(payload: unknown): { docket: string; prefix: string; status: string }[] {
  const arr = extractArray(payload, "docketNumber");
  if (arr.length === 0) return extractArray(payload, "docket-numbers").length > 0 ? extractArray(payload, "docket-numbers").map((d) => ({ docket: String(d.docketNumber ?? d.docket ?? ""), prefix: String(d.docketNumberPrefix ?? d.prefix ?? "MC"), status: String(d.activeStatus ?? d.status ?? "—") })) : [];
  return arr.map((d) => ({ docket: String(d.docketNumber ?? d.docket ?? ""), prefix: String(d.docketNumberPrefix ?? d.prefix ?? "MC"), status: String(d.activeStatus ?? d.status ?? "—") }));
}

/* ── Enhanced BASIC parsing ──────────────────────────────────────── */

type ExtBasic = BasicScore & { svDeficient: boolean; rdsvDeficient: boolean; snapDate: string | null; totalViol: number; inspWithViol: number };

function parseExtBasics(payload: unknown): ExtBasic[] {
  const raw = extractArray(payload, "basics");
  if (raw.length === 0) return [];
  const str = (v: unknown) => v == null ? null : String(v) || null;
  return raw.map((b) => ({
    name: str(b.basicsDescription) || str(b.basicsDesc) || str(b.basicDesc) || "Unknown",
    percentile: Number(b.basicsPercentile ?? b.percentile ?? 0),
    totalViolations: Number(b.totalViolations ?? b.violTot ?? 0),
    totalInspections: Number(b.totalInspections ?? b.inspTot ?? 0),
    serious: Number(b.seriousViolations ?? b.seriousViol ?? 0),
    measureValue: Number(b.basicsValue ?? b.measureValue ?? 0),
    rdDeficient: str(b.rdDeficient) === "Y" || str(b.basicsExceedFlag) === "Y",
    code: str(b.basicsId) || str(b.basicsCode) || str(b.basicCode) || "",
    svDeficient: str(b.svDeficient) === "Y",
    rdsvDeficient: str(b.rdsvDeficient) === "Y",
    snapDate: str(b.snapShotDate) || str(b.snapshotDate) || null,
    totalViol: Number(b.totalViolation ?? b.totalViolations ?? 0),
    inspWithViol: Number(b.totalInspectionWithViolation ?? 0),
  })).sort((a, b) => b.percentile - a.percentile);
}

/* ── Page ────────────────────────────────────────────────────────── */

export default async function CarrierIntelligencePage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotStr = params.dotNumber;
  const dotNum = parseInt(dotStr, 10);

  const carrier = await getCarrierByDot(dotNum);
  if (!carrier) notFound();

  const [inspR, crashR, insR, authR, basicsR, profileR, chainR, driverR, violR, cargoR, opsR, docketR] = await Promise.allSettled([
    getInspectionsByDot(dotNum, 100),
    getCrashesByDot(dotNum, 50),
    getInsuranceByDot(dotNum, 50),
    getAuthorityHistoryByDot(dotNum, 50),
    getCarrierBasics(dotStr).catch(() => null),
    getCarrierProfile(dotStr).catch(() => null),
    fetchPredecessorChain(carrier),
    getDriverMigration(dotNum),
    getViolationsByDot(dotNum, 200).catch(() => []),
    getCarrierCargoCarried(dotStr).catch(() => null),
    getCarrierOperationClassification(dotStr).catch(() => null),
    getCarrierDocketNumbers(dotStr).catch(() => null),
  ]);

  const inspections = settled(inspR, [] as SocrataInspection[]);
  const crashes = settled(crashR, [] as SocrataCrash[]);
  const insurance = settled(insR, [] as SocrataInsurance[]);
  const authorityHistory = settled(authR, [] as SocrataAuthorityHistory[]);
  const basicsPayload = settled(basicsR, null);
  const profilePayload = settled(profileR, null);
  const predecessorChain = settled(chainR, [] as SocrataCarrier[]);
  const driverMigration = settled(driverR, [] as DM[]);
  const violations = settled(violR, [] as SocrataViolation[]);
  const cargoPayload = settled(cargoR, null);
  const opsPayload = settled(opsR, null);
  const docketPayload = settled(docketR, null);

  // Computed
  const basics = basicsPayload ? parseExtBasics(basicsPayload) : [];
  const fmcsaRecord = profilePayload ? extractCarrierRecord(profilePayload) : null;
  const safetyRating = fmcsaRecord?.safetyRating as string | undefined;
  const safetyRatingDate = fmcsaRecord?.safetyRatingDate as string | undefined;
  const safetyReviewType = fmcsaRecord?.safetyReviewType as string | undefined;
  const complaintCount = extractComplaintCount(profilePayload);
  const fleetBreakdown = extractFleetBreakdown(profilePayload);
  const dockets = extractDockets(docketPayload);

  const indicator = computeQuickRiskIndicator({ powerUnits: p(carrier.power_units) || undefined, totalDrivers: p(carrier.total_drivers) || undefined, addDate: carrier.add_date, mcs150Date: carrier.mcs150_date, statusCode: carrier.status_code });
  const verdict: Verdict = indicator.grade === "A" || indicator.grade === "B" ? "pass" : indicator.grade === "C" ? "watch" : "fail";
  const signals = computeAllSignals({ carrier, insurance, authorityHistory, priorCarrier: predecessorChain[0] ?? null });
  const voip = checkVoipIndicators(carrier.phone);
  const compliance = computeCompliance(carrier, insurance, authorityHistory, basics, inspections, crashes, signals, voip, fmcsaRecord as Record<string, unknown> | null);
  const compScore = Math.round((compliance.filter((c) => c.status === "pass").length / compliance.length) * 100);
  const timeline = buildTimeline(carrier, inspections, crashes, insurance, authorityHistory);
  const insSummary = analyzeInsurance(carrier, insurance);
  const saferInsp = computeSaferInspectionSummary(inspections);
  const saferCrash = computeSaferCrashSummary(crashes);
  const issScore = computeIssScore(basics);
  const topViols = computeTopViolations(violations);

  // Stats
  const totalViols = inspections.reduce((s, i) => s + p(i.viol_total), 0);
  const totalOos = inspections.reduce((s, i) => s + p(i.oos_total), 0);
  const driverOos = inspections.reduce((s, i) => s + p(i.driver_oos_total), 0);
  const vehicleOos = inspections.reduce((s, i) => s + p(i.vehicle_oos_total), 0);
  const oosRate = inspections.length > 0 ? ((totalOos / inspections.length) * 100).toFixed(1) : "N/A";
  const totalFatal = crashes.reduce((s, c) => s + p(c.fatalities), 0);
  const totalInjury = crashes.reduce((s, c) => s + p(c.injuries), 0);
  const totalTow = crashes.reduce((s, c) => s + p(c.tow_away), 0);

  const badge = entityTypeBadge(carrier.classdef);
  const statusActive = carrier.status_code === "A";
  const cargoTypes = carrier.carship ? decodeCarship(carrier.carship) : [];
  const operationType = carrier.carrier_operation ? decodeOperation(carrier.carrier_operation) : null;
  const fleetSizeLabel = carrier.fleetsize ? decodeFleetSize(carrier.fleetsize) : null;
  const vc = VC[verdict];
  const hasSignals = signals.anomalyFlags.length > 0 || signals.authorityMill.isMillPattern || signals.brokerReincarnation.isReincarnation || voip.isLikelyVoip;

  // Operation classification grid
  const opCodes = (carrier.carrier_operation ?? "").split(";").map((c) => c.trim()).filter(Boolean);
  const allOpCodes = Object.entries(CARRIER_OPERATION_CODES);

  // Cargo grid
  const cargoCodes = (carrier.carship ?? "").split(";").map((c) => c.trim()).filter(Boolean);
  const allCargoCodes = Object.entries(CARSHIP_CODES);

  // Violation drill-down data
  const violByInsp = new Map<string, ViolationRow[]>();
  for (const v of violations) {
    const id = v.inspection_id ?? "";
    if (!id) continue;
    const arr = violByInsp.get(id) ?? [];
    arr.push({ code: v.viol_code ?? "?", description: v.viol_desc ?? "", oos: v.oos === "Y", basic: v.basic ?? "", section: v.section ?? "", group: v.group_desc ?? "" });
    violByInsp.set(id, arr);
  }
  const inspWithViols: InspectionWithViolations[] = inspections
    .filter((i) => violByInsp.has(i.inspection_id ?? ""))
    .map((i) => ({
      inspectionId: i.inspection_id ?? "",
      date: fmtDate(i.insp_date),
      state: i.report_state ?? "—",
      level: i.insp_level_id ? decodeInspectionLevel(i.insp_level_id) : "—",
      violations: violByInsp.get(i.inspection_id ?? "") ?? [],
    }));

  // BASIC snapshot date
  const basicSnapDate = basics.length > 0 ? basics[0].snapDate : null;

  return (
    <main className="min-h-screen" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide" style={{ color: "var(--accent)" }}>FleetSight</Link>
          <Link href="/" className="text-xs font-medium hover:underline" style={{ color: "var(--ink-soft)" }}>← Back to search</Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Identity ─────────────────────────────────────────── */}
        <section className="rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Pill bg={statusActive ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"} fg={statusActive ? "#15803d" : "#991b1b"}>{decodeStatus(carrier.status_code)}</Pill>
            <Pill bg="var(--accent-soft)" fg="var(--accent)">{badge.label}</Pill>
            {carrier.hm_ind === "Y" && <Pill bg="rgba(220,38,38,0.10)" fg="#991b1b">HAZMAT</Pill>}
            {safetyRating && <Pill bg="rgba(59,130,246,0.12)" fg="#1d4ed8">Rating: {safetyRating}</Pill>}
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{carrier.legal_name}</h1>
          {carrier.dba_name && <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>DBA {carrier.dba_name}</p>}
          <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2" style={{ color: "var(--ink-soft)" }}>
            <Det label="USDOT" value={dotStr} />
            <Det label="MC Number" value={carrier.docket1 ? `${carrier.docket1prefix ?? "MC"}-${carrier.docket1}` : null} />
            {dockets.length > 1 && <Det label="All Dockets" value={dockets.map((d) => `${d.prefix}-${d.docket} (${d.status})`).join(", ")} />}
            <Det label="Address" value={[carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(", ") || null} />
            <Det label="Phone" value={carrier.phone}>
              {voip.isLikelyVoip && <Pill bg="rgba(220,38,38,0.10)" fg="#991b1b">VoIP{voip.provider ? ` (${voip.provider})` : ""}</Pill>}
            </Det>
            <Det label="Principal 1" value={carrier.company_officer_1} />
            <Det label="Principal 2" value={carrier.company_officer_2} />
            <Det label="Operation" value={operationType} />
            <Det label="Fleet Size" value={fleetSizeLabel ? `${fleetSizeLabel} units` : null} />
            <Det label="Authority Date" value={fmtDate(carrier.add_date)} />
            <Det label="MCS-150" value={fmtDate(carrier.mcs150_date)} />
            {carrier.mcs150_mileage && <Det label="Mileage" value={`${parseInt(carrier.mcs150_mileage, 10).toLocaleString()} mi (${carrier.mcs150_mileage_year ?? ""})`} />}
            {complaintCount > 0 && <Det label="Complaints" value={String(complaintCount)} />}
          </div>
          {/* Safety Review */}
          {safetyRating && (
            <div className="mt-4 pt-3 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--ink-muted)" }}>
              Safety Rating: <strong style={{ color: "var(--ink)" }}>{safetyRating}</strong>
              {safetyRatingDate && <> · Date: {fmtDate(safetyRatingDate)}</>}
              {safetyReviewType && <> · Review: {safetyReviewType}</>}
            </div>
          )}
        </section>

        {/* ── Operation Classification Grid ────────────────────── */}
        {allOpCodes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>Operation Classification</h3>
              <div className="space-y-1">
                {allOpCodes.map(([code, label]) => (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span style={{ color: opCodes.includes(code) ? "#15803d" : "var(--border)" }}>{opCodes.includes(code) ? "✓" : "—"}</span>
                    <span style={{ color: opCodes.includes(code) ? "var(--ink)" : "var(--ink-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-muted)" }}>Cargo Carried</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {allCargoCodes.map(([code, label]) => (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span style={{ color: cargoCodes.includes(code) ? "#15803d" : "var(--border)" }}>{cargoCodes.includes(code) ? "✓" : "—"}</span>
                    <span style={{ color: cargoCodes.includes(code) ? "var(--ink)" : "var(--ink-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Stats ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
          <Stat label="Power Units" value={carrier.power_units ?? "—"} />
          <Stat label="Drivers" value={carrier.total_drivers ?? "—"} />
          <Stat label="Inspections" value={String(inspections.length)} />
          <Stat label="Violations" value={String(totalViols)} warn={totalViols > 0} />
          <Stat label="Crashes" value={String(crashes.length)} warn={crashes.length > 0} />
          <Stat label="OOS Rate" value={oosRate === "N/A" ? "—" : `${oosRate}%`} warn={oosRate !== "N/A" && parseFloat(oosRate) > 10} />
          <Stat label="Complaints" value={String(complaintCount)} warn={complaintCount > 0} />
        </div>

        {/* ── Risk Assessment ──────────────────────────────────── */}
        <section className="rounded-xl border-2 p-5" style={{ borderColor: vc.border, background: "var(--surface-1)" }}>
          <div className="flex items-center justify-between">
            <span className="rounded-md px-3 py-1 text-xs font-bold tracking-widest" style={{ background: vc.bg, color: vc.fg, border: `1px solid ${vc.border}` }}>{vc.label}</span>
            <span className="text-xs font-semibold" style={{ color: vc.fg }}>Grade {indicator.grade} — Score {indicator.score}</span>
          </div>
        </section>

        {/* ── Compliance Score ──────────────────────────────────── */}
        <section className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
          <div className="flex items-center justify-between mb-4">
            <Hdr title="Compliance Score" />
            <span className="text-3xl font-bold tabular-nums" style={{ color: compScore >= 80 ? "#15803d" : compScore >= 50 ? "#d97706" : "#dc2626" }}>{compScore}%</span>
          </div>
          <div className="space-y-1">
            {compliance.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-1" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                <span className="mt-0.5 text-sm shrink-0">{c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"}</span>
                <span className="text-sm font-medium" style={{ color: c.status === "pass" ? "#15803d" : c.status === "warn" ? "#d97706" : "#dc2626" }}>{c.label}</span>
                <span className="text-xs ml-auto" style={{ color: "var(--ink-muted)" }}>{c.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fraud Signals ────────────────────────────────────── */}
        <section>
          <Hdr title="Fraud & Anomaly Signals" count={hasSignals ? undefined : 0} />
          {!hasSignals ? (
            <div className="rounded-xl border p-4 text-center text-sm" style={{ borderColor: "#16a34a", background: "rgba(22,163,74,0.06)", color: "#15803d" }}>No signals detected.</div>
          ) : (
            <div className="space-y-2">
              {signals.anomalyFlags.map((f, i) => <SigCard key={i} severity={f.severity} title={f.label} detail={f.detail} />)}
              {signals.authorityMill.isMillPattern && <SigCard severity="high" title="Authority Mill Pattern" detail={`${signals.authorityMill.grantCount} grants, ${signals.authorityMill.revokeCount} revocations.`} />}
              {signals.brokerReincarnation.isReincarnation && <SigCard severity="critical" title="Broker Reincarnation" detail={`Matches prior DOT ${signals.brokerReincarnation.priorDot}.`} />}
              {voip.isLikelyVoip && <SigCard severity="medium" title="VoIP Phone" detail={voip.reason ?? "VoIP pattern detected"} />}
            </div>
          )}
        </section>

        {/* ── Predecessor Chain ─────────────────────────────────── */}
        {predecessorChain.length > 0 && (
          <section>
            <Hdr title="Predecessor Chain" />
            <div className="overflow-x-auto"><div className="flex items-center gap-2 min-w-max pb-2">
              {[...predecessorChain].reverse().map((pc) => (
                <a key={pc.dot_number} href={`/carrier/${pc.dot_number}`} className="shrink-0 rounded-lg border p-3 hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface-1)", minWidth: 180 }}>
                  <Pill bg={pc.status_code === "A" ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"} fg={pc.status_code === "A" ? "#15803d" : "#991b1b"}>{decodeStatus(pc.status_code)}</Pill>
                  <p className="mt-1 text-sm font-semibold truncate">{pc.legal_name}</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>DOT {pc.dot_number} · {fmtDate(pc.add_date)}</p>
                </a>
              ))}
              <span className="text-lg" style={{ color: "var(--ink-muted)" }}>→</span>
              <div className="shrink-0 rounded-lg border-2 p-3" style={{ borderColor: "var(--accent)", background: "var(--surface-1)", minWidth: 180 }}>
                <Pill bg="var(--accent-soft)" fg="var(--accent)">CURRENT</Pill>
                <p className="mt-1 text-sm font-semibold truncate">{carrier.legal_name}</p>
                <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>DOT {dotStr}</p>
              </div>
            </div></div>
          </section>
        )}

        {/* ── BASIC Scores + ISS ───────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Hdr title="BASIC Scores" />
            <div className="flex items-center gap-3">
              {issScore > 0 && (
                <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: issScore >= 61 ? "rgba(220,38,38,0.12)" : issScore >= 31 ? "rgba(202,138,4,0.12)" : "rgba(22,163,74,0.10)", color: issScore >= 61 ? "#991b1b" : issScore >= 31 ? "#854d0e" : "#15803d" }}>
                  ISS {issScore}
                </span>
              )}
              {basicSnapDate && <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>as of {fmtDate(basicSnapDate)}</span>}
            </div>
          </div>
          {basics.length === 0 ? <Empty text="BASIC scores not available." /> : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              {basics.map((b, i) => {
                const pct = Math.min(b.percentile, 100);
                const clr = pct >= 75 ? "#dc2626" : pct >= 50 ? "#d97706" : "#16a34a";
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                    <span className="w-40 shrink-0 text-sm font-medium truncate">{b.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: clr }} />
                    </div>
                    <span className="w-10 text-right text-sm font-semibold tabular-nums" style={{ color: clr }}>{pct}%</span>
                    {b.rdDeficient && <Pill bg="rgba(220,38,38,0.12)" fg="#991b1b">ALERT</Pill>}
                    {b.svDeficient && <Pill bg="rgba(217,119,87,0.14)" fg="#9a3412">SV</Pill>}
                    {b.rdsvDeficient && <Pill bg="rgba(220,38,38,0.12)" fg="#991b1b">RDSV</Pill>}
                    <span className="text-[10px] w-14 text-right" style={{ color: "var(--ink-muted)" }}>{b.totalViol} viols</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SAFER Inspection Summary ─────────────────────────── */}
        <section>
          <Hdr title="Inspection Summary (SAFER Format)" count={inspections.length} />
          {inspections.length === 0 ? <Empty text="No inspections." /> : (
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Category</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Inspections</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Out of Service</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>OOS %</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Nat&apos;l Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: "Vehicle", ...saferInsp.vehicle, natl: NATIONAL_AVG.vehicleOos },
                    { label: "Driver", ...saferInsp.driver, natl: NATIONAL_AVG.driverOos },
                    { label: "Hazmat", ...saferInsp.hazmat, natl: NATIONAL_AVG.hazmatOos },
                  ]).map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface-1)" : "transparent" }}>
                      <td className="px-3 py-2 font-medium" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink)" }}>{row.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{row.insp}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ borderBottom: "1px solid var(--border)", color: row.oos > 0 ? "#dc2626" : "var(--ink-soft)" }}>{row.oos}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ borderBottom: "1px solid var(--border)", color: row.pct > row.natl ? "#dc2626" : "#15803d" }}>{row.insp > 0 ? `${row.pct.toFixed(1)}%` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>{row.natl.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Top Violations ───────────────────────────────────── */}
        {topViols.length > 0 && (
          <section>
            <Hdr title="Top Violations" count={violations.length} />
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-2)" }}>
                    <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Code</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Description</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>BASIC</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Count</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>OOS</th>
                  </tr>
                </thead>
                <tbody>
                  {topViols.map((v, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "var(--surface-1)" : "transparent" }}>
                      <td className="px-3 py-2 font-mono" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>{v.code}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{v.desc.length > 60 ? v.desc.slice(0, 57) + "..." : v.desc}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--accent)" }}>{v.basic}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink)" }}>{v.count}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold" style={{ borderBottom: "1px solid var(--border)", color: v.oosCount > 0 ? "#dc2626" : "var(--ink-soft)" }}>{v.oosCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Violation Drill-Down ─────────────────────────────── */}
        {inspWithViols.length > 0 && (
          <section>
            <Hdr title="Inspection Violations (Expandable)" count={inspWithViols.length} />
            <ViolationDrillDown inspections={inspWithViols} />
          </section>
        )}

        {/* ── SAFER Crash Summary ──────────────────────────────── */}
        <section>
          <Hdr title="Crash Summary (SAFER Format)" count={crashes.length} />
          {crashes.length === 0 ? <Empty text="No crashes." /> : (
            <>
              <div className="mb-3 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      {["Fatal", "Injury", "Tow-Away", "Total"].map((h) => (
                        <th key={h} className="px-4 py-2 text-center font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: "var(--surface-1)" }}>
                      <td className="px-4 py-2 text-center tabular-nums font-semibold" style={{ color: saferCrash.fatal > 0 ? "#dc2626" : "var(--ink)" }}>{saferCrash.fatal}</td>
                      <td className="px-4 py-2 text-center tabular-nums font-semibold" style={{ color: saferCrash.injury > 0 ? "#d97706" : "var(--ink)" }}>{saferCrash.injury}</td>
                      <td className="px-4 py-2 text-center tabular-nums" style={{ color: "var(--ink-soft)" }}>{saferCrash.tow}</td>
                      <td className="px-4 py-2 text-center tabular-nums font-bold" style={{ color: "var(--ink)" }}>{saferCrash.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] mb-3" style={{ color: "var(--ink-muted)" }}>Each crash recorded once at highest severity. Fatal &gt; Injury &gt; Tow-Away.</p>
              <DT headers={["Date", "State", "City", "Fatalities", "Injuries", "Tow", "Report #"]} rows={crashes.map((c) => [fmtDate(c.report_date), c.report_state ?? "—", c.city ?? "—", c.fatalities ?? "0", c.injuries ?? "0", c.tow_away ?? "0", c.report_number ?? "—"])} warnCol={3} />
            </>
          )}
        </section>

        {/* ── Event Timeline ───────────────────────────────────── */}
        {timeline.length > 0 && (
          <section>
            <Hdr title="Event Timeline" count={timeline.length} />
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: "var(--border)" }} />
                {timeline.slice(0, 40).map((ev, i) => {
                  const dc = ev.sev === "red" ? "#dc2626" : ev.sev === "amber" ? "#d97706" : "#16a34a";
                  return (
                    <div key={i} className="relative flex items-start gap-3 pb-2" style={{ paddingTop: i > 0 ? 8 : 0 }}>
                      <div className="absolute -left-4 mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dc, border: "2px solid var(--surface-1)" }} />
                      <span className="text-[10px] font-medium tabular-nums shrink-0 w-20" style={{ color: "var(--ink-muted)" }}>{fmtDate(ev.date.toISOString())}</span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase shrink-0" style={{ background: dc + "18", color: dc }}>{ev.type}</span>
                      <span className="text-xs" style={{ color: "var(--ink-soft)" }}>{ev.text}</span>
                    </div>
                  );
                })}
              </div>
              {timeline.length > 40 && <p className="mt-2 text-center text-[10px]" style={{ color: "var(--ink-muted)" }}>Showing 40 of {timeline.length} events.</p>}
            </div>
          </section>
        )}

        {/* ── Insurance Intelligence ───────────────────────────── */}
        <section>
          <Hdr title="Insurance Intelligence" count={insurance.length} />
          {insurance.length > 0 && (
            <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>BIPD</p>
                  <p className="text-sm font-semibold" style={{ color: insSummary.hasBipd ? (insSummary.adequate ? "#15803d" : "#d97706") : "#dc2626" }}>{insSummary.hasBipd ? (insSummary.adequate ? "Adequate" : "Below Min") : "No BIPD"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Coverage</p>
                  <p className="text-sm font-semibold">{fmtCurrency(insSummary.bipdCov)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Insurers</p>
                  <p className="text-sm font-semibold" style={{ color: insSummary.insurers.length >= 4 ? "#d97706" : "var(--ink)" }}>{insSummary.insurers.length}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Last Filing</p>
                  <p className="text-sm font-semibold">{insSummary.daysSince != null ? `${insSummary.daysSince}d ago` : "—"}</p>
                </div>
              </div>
            </div>
          )}
          {insurance.length === 0 ? <Empty text="No insurance filings." /> : (
            <DT headers={["Type", "Insurer", "Policy #", "Coverage", "Effective"]} rows={insurance.map((i) => [i.mod_col_1 ?? "—", i.name_company ?? "—", i.policy_no ?? "—", fmtCurrency(i.max_cov_amount || i.underl_lim_amount), fmtDate(i.effective_date)])} />
          )}
        </section>

        {/* ── Authority History ─────────────────────────────────── */}
        <section>
          <Hdr title="Authority History" count={authorityHistory.length} />
          {authorityHistory.length === 0 ? <Empty text="No authority history." /> : (
            <DT headers={["Docket", "Type", "Action", "Grant Date", "Disposition", "Disp Date"]} rows={authorityHistory.map((a) => [a.docket_number ?? "—", a.mod_col_1 ?? "—", a.original_action_desc ?? "—", fmtDate(a.orig_served_date), a.disp_action_desc ?? "—", fmtDate(a.disp_served_date)])} warnCol={4} warnValues={["REVOKED", "SUSPENDED", "RESCINDED"]} />
          )}
        </section>

        {/* ── Equipment ────────────────────────────────────────── */}
        {(p(carrier.owntract) > 0 || p(carrier.owntruck) > 0 || p(carrier.owntrail) > 0 || p(carrier.trmtrail) > 0 || Object.keys(fleetBreakdown).length > 0) && (
          <section>
            <Hdr title="Equipment" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p(carrier.owntract) > 0 && <Stat label="Owned Tractors" value={carrier.owntract!} />}
              {p(carrier.owntruck) > 0 && <Stat label="Owned Trucks" value={carrier.owntruck!} />}
              {p(carrier.owntrail) > 0 && <Stat label="Owned Trailers" value={carrier.owntrail!} />}
              {p(carrier.trmtrail) > 0 && <Stat label="Term Trailers" value={carrier.trmtrail!} />}
              {Object.entries(fleetBreakdown).map(([label, count]) => <Stat key={label} label={label} value={String(count)} />)}
            </div>
          </section>
        )}

        {/* ── Driver Migration ─────────────────────────────────── */}
        {driverMigration.length > 0 && (
          <section>
            <Hdr title="Driver Migration" />
            <DT headers={["Carrier", "DOT", "Status", "Shared Drivers"]} rows={driverMigration.map((dm) => [dm.legalName ?? "Unknown", String(dm.dotNumber), dm.statusCode ? decodeStatus(dm.statusCode) : "—", String(dm.sharedDrivers)])} warnCol={2} warnValues={["OUT OF SERVICE", "INACTIVE"]} />
          </section>
        )}

        {/* ── Enabler Risk ─────────────────────────────────────── */}
        <section>
          <Hdr title="Enabler Risk Intelligence" />
          <EnablerRisk dotNumber={dotStr} />
        </section>

        {/* ── Entity Graph ─────────────────────────────────────── */}
        <section>
          <Hdr title="Entity Relationship Graph" />
          <NetworkGraph dotNumber={dotStr} />
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="pt-4 text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
          <p>Data: FMCSA SAFER, SMS, Socrata, NHTSA. Socrata cached 1hr. FMCSA 5min. Page ISR 24hr.</p>
          <p className="mt-1">
            <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>← Search</Link>
            {" · "}<Link href="/blog" style={{ color: "var(--accent)", textDecoration: "none" }}>Blog</Link>
            {" · "}<Link href="/terms" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms</Link>
            {" · "}<Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ── Shared Components ───────────────────────────────────────────── */

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color: fg }}>{children}</span>;
}
function Hdr({ title, count }: { title: string; count?: number }) {
  return <h2 className="mb-3 text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{title}{count !== undefined && <span className="ml-2 text-sm font-normal" style={{ color: "var(--ink-muted)" }}>({count})</span>}</h2>;
}
function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <div className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}><p className="text-lg font-bold tabular-nums" style={{ color: warn ? "#dc2626" : "var(--ink)" }}>{value}</p><p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>{label}</p></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>{text}</div>;
}
function Det({ label, value, children }: { label: string; value: string | null | undefined; children?: React.ReactNode }) {
  if (!value) return null;
  return <div><span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>{label}: </span><span className="text-sm">{value}</span>{children}</div>;
}
function SigCard({ severity, title, detail }: { severity: string; title: string; detail: string }) {
  const sc = SC[severity] ?? SC.low;
  return <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}><div className="flex items-center gap-2 mb-1"><span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.fg }}>{severity}</span><span className="text-sm font-semibold">{title}</span></div><p className="text-xs" style={{ color: "var(--ink-soft)" }}>{detail}</p></div>;
}
function DT({ headers, rows, warnCol, warnValues }: { headers: string[]; rows: string[][]; warnCol?: number; warnValues?: string[] }) {
  const sw = (ci: number, v: string) => { if (ci !== warnCol) return false; if (warnValues) return warnValues.some((w) => v.toUpperCase().includes(w)); const n = parseInt(v, 10); return Number.isFinite(n) && n > 0; };
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "var(--surface-2)" }}>{headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--surface-1)" : "transparent" }}>{row.map((cell, ci) => <td key={ci} className="px-3 py-2 whitespace-nowrap" style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : undefined, color: sw(ci, cell) ? "#dc2626" : "var(--ink-soft)", fontWeight: sw(ci, cell) ? 600 : undefined }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
