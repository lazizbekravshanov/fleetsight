/**
 * Full carrier intelligence page — 7 killer features.
 *
 * Single scrollable page: identity, stats, risk, compliance score, fraud
 * signals, predecessor chain, BASIC scores, event timeline, inspections,
 * crashes, insurance continuity + table, authority, equipment, driver
 * migration, enabler risk, entity relationship graph.
 *
 * All data fetched server-side in parallel. No tabs. No dashboard.
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
  type SocrataCarrier,
  type SocrataInspection,
  type SocrataCrash,
  type SocrataInsurance,
  type SocrataAuthorityHistory,
} from "@/lib/socrata";
import { getCarrierBasics, getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { computeAllSignals } from "@/lib/detection-signals";
import { checkVoipIndicators } from "@/lib/voip-check";
import {
  decodeStatus,
  entityTypeBadge,
  decodeOperation,
  decodeCarship,
  decodeFleetSize,
  decodeInspectionLevel,
} from "@/lib/fmcsa-codes";
import { parseBasics } from "@/components/carrier/shared";
import type { BasicScore } from "@/components/carrier/types";
import { prisma } from "@/lib/prisma";
import { NetworkGraph } from "@/components/carrier/network-graph";
import { EnablerRisk } from "@/components/carrier/enabler-risk";

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
    description: `Full intelligence profile for ${carrier.legal_name} (USDOT ${dot})${carrier.phy_state ? ` in ${carrier.phy_state}` : ""}. Safety, inspections, crashes, insurance, fraud signals, compliance score.`,
    openGraph: {
      title: `${carrier.legal_name} — DOT ${dot}`,
      description: `Carrier intelligence: safety, compliance, fraud signals.`,
      type: "website",
    },
  };
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function p(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtCurrency(v: string | number | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return "—";
  return "$" + n.toLocaleString("en-US");
}

function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}

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

/* ── Predecessor Chain (Feature 5) ───────────────────────────────── */

async function fetchPredecessorChain(carrier: SocrataCarrier, maxDepth = 5): Promise<SocrataCarrier[]> {
  const chain: SocrataCarrier[] = [];
  let current = carrier;
  const seen = new Set<string>();
  seen.add(current.dot_number);

  for (let i = 0; i < maxDepth; i++) {
    if (current.prior_revoke_flag !== "Y" || !current.prior_revoke_dot) break;
    const priorDot = current.prior_revoke_dot;
    if (seen.has(priorDot)) break;
    seen.add(priorDot);
    const prior = await getCarrierByDot(parseInt(priorDot, 10)).catch(() => null);
    if (!prior) break;
    chain.push(prior);
    current = prior;
  }
  return chain;
}

/* ── Compliance Score (Feature 4) ────────────────────────────────── */

type ComplianceCheck = { label: string; status: "pass" | "warn" | "fail"; detail: string };

function computeCompliance(
  carrier: SocrataCarrier,
  insurance: SocrataInsurance[],
  authorityHistory: SocrataAuthorityHistory[],
  basics: BasicScore[],
  inspections: SocrataInspection[],
  crashes: SocrataCrash[],
  signals: { anomalyFlags: { severity: string }[] },
  voip: { isLikelyVoip: boolean },
  fmcsaRecord: Record<string, unknown> | null,
): ComplianceCheck[] {
  const checks: ComplianceCheck[] = [];
  const now = Date.now();

  // 1. Active USDOT
  checks.push({
    label: "Active USDOT Status",
    status: carrier.status_code === "A" ? "pass" : "fail",
    detail: carrier.status_code === "A" ? "USDOT status is Active" : `USDOT status: ${decodeStatus(carrier.status_code)}`,
  });

  // 2. Active Operating Authority
  const hasActiveAuth = authorityHistory.some((a) => a.original_action_desc === "GRANTED" && !a.disp_action_desc);
  checks.push({
    label: "Active Operating Authority",
    status: hasActiveAuth ? "pass" : authorityHistory.length > 0 ? "fail" : "warn",
    detail: hasActiveAuth ? "At least one active authority on file" : "No active (non-revoked) authority found",
  });

  // 3. Current BIPD Insurance
  const bipdFilings = insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  const recentBipd = bipdFilings.some((i) => {
    if (!i.effective_date) return false;
    const d = new Date(i.effective_date);
    return now - d.getTime() < 365 * 24 * 60 * 60 * 1000;
  });
  checks.push({
    label: "Current BIPD Insurance",
    status: recentBipd ? "pass" : bipdFilings.length > 0 ? "warn" : "fail",
    detail: recentBipd ? "BIPD filing within last 12 months" : bipdFilings.length > 0 ? "BIPD filing found but may be stale" : "No BIPD liability filing found",
  });

  // 4. Adequate Coverage
  const isHazmat = carrier.hm_ind === "Y";
  const minCoverage = isHazmat ? 5000000 : 750000;
  const maxCov = Math.max(...bipdFilings.map((i) => p(i.max_cov_amount) || p(i.underl_lim_amount)), 0);
  checks.push({
    label: "Adequate Coverage",
    status: maxCov >= minCoverage ? "pass" : maxCov > 0 ? "warn" : "fail",
    detail: maxCov >= minCoverage ? `Coverage ${fmtCurrency(maxCov)} meets ${isHazmat ? "hazmat" : "general"} minimum` : maxCov > 0 ? `Coverage ${fmtCurrency(maxCov)} below ${fmtCurrency(minCoverage)} minimum` : "No coverage amount on file",
  });

  // 5. MCS-150 Current
  const mcs150Age = carrier.mcs150_date ? (now - new Date(carrier.mcs150_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44) : Infinity;
  checks.push({
    label: "MCS-150 Current",
    status: mcs150Age <= 24 ? "pass" : mcs150Age <= 36 ? "warn" : "fail",
    detail: mcs150Age <= 24 ? `Updated ${fmtDate(carrier.mcs150_date)}` : mcs150Age <= 36 ? `Overdue — last updated ${fmtDate(carrier.mcs150_date)}` : "MCS-150 is stale or missing",
  });

  // 6. No Active OOS
  const hasOos = carrier.status_code === "OOS" || (fmcsaRecord?.oosDate as string | undefined);
  checks.push({
    label: "No Active OOS Order",
    status: hasOos ? "fail" : "pass",
    detail: hasOos ? "Carrier has an active out-of-service order" : "No active OOS order",
  });

  // 7. No BASIC Alerts
  const alertCount = basics.filter((b) => b.rdDeficient).length;
  checks.push({
    label: "No BASIC Alerts",
    status: alertCount === 0 ? "pass" : alertCount <= 1 ? "warn" : "fail",
    detail: alertCount === 0 ? "No BASICs exceed intervention threshold" : `${alertCount} BASIC categor${alertCount === 1 ? "y exceeds" : "ies exceed"} threshold`,
  });

  // 8. Acceptable OOS Rate
  const totalOos = inspections.reduce((s, i) => s + p(i.oos_total), 0);
  const oosRateNum = inspections.length > 0 ? (totalOos / inspections.length) * 100 : 0;
  checks.push({
    label: "Acceptable OOS Rate",
    status: inspections.length === 0 ? "warn" : oosRateNum <= 6 ? "pass" : oosRateNum <= 15 ? "warn" : "fail",
    detail: inspections.length === 0 ? "No inspections to evaluate" : `OOS rate ${oosRateNum.toFixed(1)}% (national avg ~6%)`,
  });

  // 9. No Recent Fatal Crashes
  const recentFatal = crashes.filter((c) => {
    if (!c.report_date) return false;
    const age = now - new Date(c.report_date).getTime();
    return age < 730 * 24 * 60 * 60 * 1000 && p(c.fatalities) > 0;
  }).length;
  checks.push({
    label: "No Recent Fatal Crashes",
    status: recentFatal === 0 ? "pass" : "fail",
    detail: recentFatal === 0 ? "No fatalities in last 24 months" : `${recentFatal} fatal crash${recentFatal > 1 ? "es" : ""} in last 24 months`,
  });

  // 10. No Chameleon Signals
  const critHigh = signals.anomalyFlags.filter((f) => f.severity === "critical" || f.severity === "high").length;
  checks.push({
    label: "No Chameleon Signals",
    status: critHigh === 0 ? "pass" : "fail",
    detail: critHigh === 0 ? "No critical/high fraud signals" : `${critHigh} critical/high anomaly signal${critHigh > 1 ? "s" : ""} detected`,
  });

  // 11. Phone Verification
  checks.push({
    label: "Phone Verification",
    status: voip.isLikelyVoip ? "warn" : carrier.phone ? "pass" : "warn",
    detail: voip.isLikelyVoip ? "Phone flagged as VoIP" : carrier.phone ? "Non-VoIP phone on file" : "No phone number on file",
  });

  // 12. Fleet-Driver Ratio
  const pu = p(carrier.power_units);
  const dr = p(carrier.total_drivers);
  const ratioOk = pu > 0 && dr > 0 && dr / pu >= 0.5 && dr / pu <= 5;
  checks.push({
    label: "Fleet-Driver Ratio",
    status: pu === 0 && dr === 0 ? "fail" : ratioOk ? "pass" : "warn",
    detail: pu === 0 && dr === 0 ? "Zero power units and zero drivers" : `${pu} units, ${dr} drivers (ratio ${pu > 0 ? (dr / pu).toFixed(1) : "N/A"})`,
  });

  return checks;
}

/* ── Timeline Events (Feature 1) ────────────────────────────────── */

type TimelineEvent = { date: Date; type: string; severity: "green" | "amber" | "red"; summary: string };

function buildTimeline(
  carrier: SocrataCarrier,
  inspections: SocrataInspection[],
  crashes: SocrataCrash[],
  insurance: SocrataInsurance[],
  authorityHistory: SocrataAuthorityHistory[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (carrier.add_date) {
    events.push({ date: new Date(carrier.add_date), type: "Authority", severity: "green", summary: "Authority granted — USDOT registered" });
  }
  if (carrier.mcs150_date) {
    events.push({ date: new Date(carrier.mcs150_date), type: "MCS-150", severity: "amber", summary: "MCS-150 filing updated" });
  }

  for (const i of inspections) {
    if (!i.insp_date) continue;
    const oos = p(i.oos_total) > 0;
    const viols = p(i.viol_total);
    events.push({
      date: new Date(i.insp_date),
      type: "Inspection",
      severity: oos ? "red" : viols > 0 ? "amber" : "green",
      summary: `${oos ? "OOS " : ""}Inspection in ${i.report_state ?? "?"} — ${viols} violation${viols !== 1 ? "s" : ""}`,
    });
  }

  for (const c of crashes) {
    if (!c.report_date) continue;
    const fatal = p(c.fatalities) > 0;
    const inj = p(c.injuries) > 0;
    events.push({
      date: new Date(c.report_date),
      type: "Crash",
      severity: "red",
      summary: `Crash in ${c.report_state ?? "?"}${fatal ? ` — ${c.fatalities} fatalit${p(c.fatalities) > 1 ? "ies" : "y"}` : ""}${inj ? ` — ${c.injuries} injur${p(c.injuries) > 1 ? "ies" : "y"}` : ""}`,
    });
  }

  for (const ins of insurance) {
    if (!ins.effective_date) continue;
    events.push({
      date: new Date(ins.effective_date),
      type: "Insurance",
      severity: "green",
      summary: `Insurance filed: ${ins.mod_col_1 ?? "unknown type"} — ${ins.name_company ?? "unknown insurer"}`,
    });
  }

  for (const a of authorityHistory) {
    if (a.orig_served_date) {
      events.push({
        date: new Date(a.orig_served_date),
        type: "Authority",
        severity: "green",
        summary: `${a.original_action_desc ?? "Action"}: ${a.mod_col_1 ?? "authority"}`,
      });
    }
    if (a.disp_served_date && a.disp_action_desc) {
      const isRevoke = ["REVOKED", "SUSPENDED", "RESCINDED"].includes(a.disp_action_desc.toUpperCase());
      events.push({
        date: new Date(a.disp_served_date),
        type: "Authority",
        severity: isRevoke ? "red" : "amber",
        summary: `${a.disp_action_desc}: ${a.mod_col_1 ?? "authority"}`,
      });
    }
  }

  return events
    .filter((e) => !isNaN(e.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/* ── Insurance Continuity (Feature 3) ────────────────────────────── */

type InsuranceSummary = {
  hasBipd: boolean;
  bipdCoverage: number;
  isAdequate: boolean;
  isHazmat: boolean;
  uniqueInsurers: string[];
  oldestFiling: string | null;
  newestFiling: string | null;
  daysSinceLastFiling: number | null;
};

function analyzeInsurance(carrier: SocrataCarrier, insurance: SocrataInsurance[]): InsuranceSummary {
  const isHazmat = carrier.hm_ind === "Y";
  const bipdFilings = insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  const bipdCoverage = Math.max(...bipdFilings.map((i) => p(i.max_cov_amount) || p(i.underl_lim_amount)), 0);
  const minCoverage = isHazmat ? 5000000 : 750000;

  const dates = insurance.map((i) => i.effective_date).filter(Boolean).sort();
  const newestDate = dates.length > 0 ? dates[dates.length - 1] : null;
  const daysSince = newestDate ? Math.floor((Date.now() - new Date(newestDate!).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const uniqueInsurers = [...new Set(insurance.map((i) => i.name_company).filter(Boolean) as string[])];

  return {
    hasBipd: bipdFilings.length > 0,
    bipdCoverage,
    isAdequate: bipdCoverage >= minCoverage,
    isHazmat,
    uniqueInsurers,
    oldestFiling: dates[0] ?? null,
    newestFiling: newestDate ?? null,
    daysSinceLastFiling: daysSince,
  };
}

/* ── Driver Migration (Feature 7) ────────────────────────────────── */

type DriverMigration = { dotNumber: number; legalName: string | null; statusCode: string | null; sharedDrivers: number };

async function getDriverMigration(dotNumber: number): Promise<DriverMigration[]> {
  try {
    // Find all CDLs observed at this carrier
    const cdls = await prisma.driverObservation.findMany({
      where: { dotNumber },
      select: { cdlKey: true },
      distinct: ["cdlKey"],
    });
    if (cdls.length === 0) return [];

    const cdlKeys = cdls.map((c) => c.cdlKey);

    // Find other carriers where these CDLs appear
    const otherObs = await prisma.driverObservation.groupBy({
      by: ["dotNumber"],
      where: { cdlKey: { in: cdlKeys }, dotNumber: { not: dotNumber } },
      _count: { cdlKey: true },
    });
    if (otherObs.length === 0) return [];

    // Get carrier names for the top connections
    const topObs = otherObs.sort((a, b) => b._count.cdlKey - a._count.cdlKey).slice(0, 10);
    const dotNumbers = topObs.map((o) => o.dotNumber);
    const carriers = await prisma.fmcsaCarrier.findMany({
      where: { dotNumber: { in: dotNumbers } },
      select: { dotNumber: true, legalName: true, statusCode: true },
    });
    const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));

    return topObs.map((o) => {
      const c = carrierMap.get(o.dotNumber);
      return {
        dotNumber: o.dotNumber,
        legalName: c?.legalName ?? null,
        statusCode: c?.statusCode ?? null,
        sharedDrivers: o._count.cdlKey,
      };
    });
  } catch {
    return [];
  }
}

/* ── Page ────────────────────────────────────────────────────────── */

export default async function CarrierIntelligencePage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotStr = params.dotNumber;
  const dotNum = parseInt(dotStr, 10);

  const carrier = await getCarrierByDot(dotNum);
  if (!carrier) notFound();

  // Phase 2: all data in parallel
  const [inspR, crashR, insR, authR, basicsR, profileR, chainR, driverR] = await Promise.allSettled([
    getInspectionsByDot(dotNum, 100),
    getCrashesByDot(dotNum, 50),
    getInsuranceByDot(dotNum, 50),
    getAuthorityHistoryByDot(dotNum, 50),
    getCarrierBasics(dotStr).catch(() => null),
    getCarrierProfile(dotStr).catch(() => null),
    fetchPredecessorChain(carrier),
    getDriverMigration(dotNum),
  ]);

  const inspections = settled(inspR, [] as SocrataInspection[]);
  const crashes = settled(crashR, [] as SocrataCrash[]);
  const insurance = settled(insR, [] as SocrataInsurance[]);
  const authorityHistory = settled(authR, [] as SocrataAuthorityHistory[]);
  const basicsPayload = settled(basicsR, null);
  const profilePayload = settled(profileR, null);
  const predecessorChain = settled(chainR, [] as SocrataCarrier[]);
  const driverMigration = settled(driverR, [] as DriverMigration[]);

  // Phase 3: computed analysis
  const basics: BasicScore[] = basicsPayload ? parseBasics(basicsPayload) : [];
  const fmcsaRecord = profilePayload ? extractCarrierRecord(profilePayload) : null;
  const safetyRating = fmcsaRecord?.safetyRating as string | undefined;

  const indicator = computeQuickRiskIndicator({
    powerUnits: p(carrier.power_units) || undefined,
    totalDrivers: p(carrier.total_drivers) || undefined,
    addDate: carrier.add_date,
    mcs150Date: carrier.mcs150_date,
    statusCode: carrier.status_code,
  });
  const verdict: Verdict = indicator.grade === "A" || indicator.grade === "B" ? "pass" : indicator.grade === "C" ? "watch" : "fail";

  const signals = computeAllSignals({ carrier, insurance, authorityHistory, priorCarrier: predecessorChain[0] ?? null });
  const voip = checkVoipIndicators(carrier.phone);
  const compliance = computeCompliance(carrier, insurance, authorityHistory, basics, inspections, crashes, signals, voip, fmcsaRecord as Record<string, unknown> | null);
  const complianceScore = Math.round((compliance.filter((c) => c.status === "pass").length / compliance.length) * 100);
  const timeline = buildTimeline(carrier, inspections, crashes, insurance, authorityHistory);
  const insSummary = analyzeInsurance(carrier, insurance);

  // Inspection stats
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
  const hasAnySignals = signals.anomalyFlags.length > 0 || signals.authorityMill.isMillPattern || signals.brokerReincarnation.isReincarnation || voip.isLikelyVoip;

  // Driver migration chameleon flag
  const totalDrivers = p(carrier.total_drivers);
  const driverChameleonFlag = driverMigration.length > 0 && totalDrivers > 0 && driverMigration.some((dm) => dm.sharedDrivers >= totalDrivers * 0.5);

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
            <Badge bg={statusActive ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"} fg={statusActive ? "#15803d" : "#991b1b"}>{decodeStatus(carrier.status_code)}</Badge>
            <Badge bg="var(--accent-soft)" fg="var(--accent)">{badge.label}</Badge>
            {carrier.hm_ind === "Y" && <Badge bg="rgba(220,38,38,0.10)" fg="#991b1b">HAZMAT</Badge>}
            {safetyRating && <Badge bg="rgba(59,130,246,0.12)" fg="#1d4ed8">Rating: {safetyRating}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>{carrier.legal_name}</h1>
          {carrier.dba_name && <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>DBA {carrier.dba_name}</p>}
          <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2" style={{ color: "var(--ink-soft)" }}>
            <Detail label="USDOT" value={dotStr} />
            <Detail label="MC Number" value={carrier.docket1 ? `${carrier.docket1prefix ?? "MC"}-${carrier.docket1}` : null} />
            <Detail label="Address" value={[carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(", ") || null} />
            <Detail label="Phone" value={carrier.phone}>
              {voip.isLikelyVoip && <Badge bg="rgba(220,38,38,0.10)" fg="#991b1b">VoIP{voip.provider ? ` (${voip.provider})` : ""}</Badge>}
            </Detail>
            <Detail label="Principal 1" value={carrier.company_officer_1} />
            <Detail label="Principal 2" value={carrier.company_officer_2} />
            <Detail label="Operation" value={operationType} />
            <Detail label="Fleet Size" value={fleetSizeLabel ? `${fleetSizeLabel} units` : null} />
            <Detail label="Authority Date" value={fmtDate(carrier.add_date)} />
            <Detail label="MCS-150 Updated" value={fmtDate(carrier.mcs150_date)} />
            {carrier.mcs150_mileage && <Detail label="Annual Mileage" value={`${parseInt(carrier.mcs150_mileage, 10).toLocaleString()} mi (${carrier.mcs150_mileage_year ?? ""})`} />}
            {cargoTypes.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>Cargo: </span>
                <span className="text-xs">{cargoTypes.join(", ")}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Summary Stats ────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatTile label="Power Units" value={carrier.power_units ?? "—"} />
          <StatTile label="Drivers" value={carrier.total_drivers ?? "—"} />
          <StatTile label="Inspections" value={String(inspections.length)} />
          <StatTile label="Violations" value={String(totalViols)} warn={totalViols > 0} />
          <StatTile label="Crashes" value={String(crashes.length)} warn={crashes.length > 0} />
          <StatTile label="OOS Rate" value={oosRate === "N/A" ? "—" : `${oosRate}%`} warn={oosRate !== "N/A" && parseFloat(oosRate) > 10} />
        </div>

        {/* ── Risk Assessment ──────────────────────────────────── */}
        <section className="rounded-xl border-2 p-5" style={{ borderColor: vc.border, background: "var(--surface-1)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-md px-3 py-1 text-xs font-bold tracking-widest" style={{ background: vc.bg, color: vc.fg, border: `1px solid ${vc.border}` }}>{vc.label}</span>
            <span className="text-xs font-semibold" style={{ color: vc.fg }}>Grade {indicator.grade} — Score {indicator.score}</span>
          </div>
          <h3 className="text-base font-semibold">
            {verdict === "pass" ? "No headline risks detected from public data" : verdict === "watch" ? "Worth a closer look — review safety and inspection history" : "Elevated risk — review safety, inspections, and authority history"}
          </h3>
        </section>

        {/* ── Feature 4: Compliance Completeness Score ──────────── */}
        <section className="rounded-xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>Compliance Score</h2>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tabular-nums" style={{ color: complianceScore >= 80 ? "#15803d" : complianceScore >= 50 ? "#d97706" : "#dc2626" }}>
                {complianceScore}%
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            {compliance.map((c, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                <span className="mt-0.5 text-sm shrink-0">
                  {c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ color: c.status === "pass" ? "#15803d" : c.status === "warn" ? "#d97706" : "#dc2626" }}>{c.label}</span>
                  <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fraud & Anomaly Signals ──────────────────────────── */}
        <section>
          <SectionHeader title="Fraud & Anomaly Signals" count={hasAnySignals ? undefined : 0} />
          {!hasAnySignals ? (
            <div className="rounded-xl border p-4 text-center text-sm" style={{ borderColor: "#16a34a", background: "rgba(22,163,74,0.06)", color: "#15803d" }}>No fraud or anomaly signals detected.</div>
          ) : (
            <div className="space-y-2">
              {signals.anomalyFlags.map((f, i) => {
                const sc = SC[f.severity] ?? SC.low;
                return (
                  <div key={i} className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.fg }}>{f.severity}</span>
                      <span className="text-sm font-semibold">{f.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{f.detail}</p>
                  </div>
                );
              })}
              {signals.authorityMill.isMillPattern && (
                <SignalCard severity="high" title="Authority Mill Pattern" detail={`${signals.authorityMill.grantCount} grants, ${signals.authorityMill.revokeCount} revocations, avg ${Math.round(signals.authorityMill.avgDaysBetween)} days between cycles.`} />
              )}
              {signals.brokerReincarnation.isReincarnation && (
                <SignalCard severity="critical" title="Broker Reincarnation Detected" detail={`Matches prior DOT ${signals.brokerReincarnation.priorDot}${signals.brokerReincarnation.addressMatch ? " — address" : ""}${signals.brokerReincarnation.phoneMatch ? " — phone" : ""}${signals.brokerReincarnation.officerMatch ? " — officer" : ""} match.`} />
              )}
              {voip.isLikelyVoip && (
                <SignalCard severity="medium" title="VoIP Phone Detected" detail={`${voip.reason ?? "Phone matches known VoIP provider patterns"}${voip.provider ? ` (${voip.provider})` : ""}.`} />
              )}
            </div>
          )}
        </section>

        {/* ── Feature 5: Predecessor Chain ─────────────────────── */}
        {predecessorChain.length > 0 && (
          <section>
            <SectionHeader title="Predecessor Chain (Chameleon Lineage)" />
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max pb-2">
                {[...predecessorChain].reverse().map((pc) => {
                  const pcActive = pc.status_code === "A";
                  return (
                    <a key={pc.dot_number} href={`/carrier/${pc.dot_number}`} className="shrink-0 rounded-lg border p-3 hover:border-[var(--accent)] transition-colors" style={{ borderColor: "var(--border)", background: "var(--surface-1)", minWidth: 180 }}>
                      <Badge bg={pcActive ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)"} fg={pcActive ? "#15803d" : "#991b1b"}>{decodeStatus(pc.status_code)}</Badge>
                      <p className="mt-1 text-sm font-semibold truncate">{pc.legal_name}</p>
                      <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>DOT {pc.dot_number} · {fmtDate(pc.add_date)}</p>
                    </a>
                  );
                })}
                <span className="text-lg" style={{ color: "var(--ink-muted)" }}>→</span>
                <div className="shrink-0 rounded-lg border-2 p-3" style={{ borderColor: "var(--accent)", background: "var(--surface-1)", minWidth: 180 }}>
                  <Badge bg="var(--accent-soft)" fg="var(--accent)">CURRENT</Badge>
                  <p className="mt-1 text-sm font-semibold truncate">{carrier.legal_name}</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>DOT {dotStr} · {fmtDate(carrier.add_date)}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── BASIC Scores ─────────────────────────────────────── */}
        <section>
          <SectionHeader title="BASIC Scores" />
          {basics.length === 0 ? <EmptyState text="BASIC score data not available for this carrier." /> : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              {basics.map((b, i) => {
                const pct = Math.min(b.percentile, 100);
                const barColor = pct >= 75 ? "#dc2626" : pct >= 50 ? "#d97706" : "#16a34a";
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                    <span className="w-44 shrink-0 text-sm font-medium truncate">{b.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold tabular-nums" style={{ color: barColor }}>{pct}%</span>
                    {b.rdDeficient && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(220,38,38,0.12)", color: "#991b1b" }}>ALERT</span>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Feature 1: Unified Event Timeline ────────────────── */}
        {timeline.length > 0 && (
          <section>
            <SectionHeader title="Event Timeline" count={timeline.length} />
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-0.5" style={{ background: "var(--border)" }} />
                {timeline.slice(0, 50).map((ev, i) => {
                  const dotColor = ev.severity === "red" ? "#dc2626" : ev.severity === "amber" ? "#d97706" : "#16a34a";
                  return (
                    <div key={i} className="relative flex items-start gap-3 pb-3" style={{ borderBottom: i < Math.min(timeline.length, 50) - 1 ? "1px solid var(--border)" : undefined, paddingTop: i > 0 ? 12 : 0 }}>
                      <div className="absolute -left-4 mt-1 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dotColor, border: "2px solid var(--surface-1)" }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium tabular-nums" style={{ color: "var(--ink-muted)" }}>{fmtDate(ev.date.toISOString())}</span>
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase" style={{ background: dotColor + "18", color: dotColor }}>{ev.type}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>{ev.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {timeline.length > 50 && <p className="mt-3 text-center text-xs" style={{ color: "var(--ink-muted)" }}>Showing 50 of {timeline.length} events.</p>}
            </div>
          </section>
        )}

        {/* ── Inspections ──────────────────────────────────────── */}
        <section>
          <SectionHeader title="Inspections" count={inspections.length} />
          {inspections.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span>Violations: <strong style={{ color: "var(--ink)" }}>{totalViols}</strong></span>
              <span>OOS: <strong style={{ color: "var(--ink)" }}>{totalOos}</strong></span>
              <span>Driver OOS: <strong>{driverOos}</strong></span>
              <span>Vehicle OOS: <strong>{vehicleOos}</strong></span>
              <span>OOS rate: <strong style={{ color: parseFloat(oosRate) > 10 ? "#dc2626" : "var(--ink)" }}>{oosRate}%</strong></span>
            </div>
          )}
          {inspections.length === 0 ? <EmptyState text="No inspection records found." /> : (
            <DataTable
              headers={["Date", "State", "Level", "Violations", "OOS", "Driver Viols", "Vehicle Viols", "Location"]}
              rows={inspections.slice(0, 25).map((i) => [fmtDate(i.insp_date), i.report_state ?? "—", i.insp_level_id ? decodeInspectionLevel(i.insp_level_id) : "—", i.viol_total ?? "0", i.oos_total ?? "0", i.driver_viol_total ?? "0", i.vehicle_viol_total ?? "0", i.location_desc ?? "—"])}
              warnCol={4}
            />
          )}
          {inspections.length > 25 && <p className="mt-2 text-xs text-center" style={{ color: "var(--ink-muted)" }}>Showing 25 of {inspections.length} inspections.</p>}
        </section>

        {/* ── Crashes ──────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Crashes" count={crashes.length} />
          {crashes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span>Fatalities: <strong style={{ color: totalFatal > 0 ? "#dc2626" : "var(--ink)" }}>{totalFatal}</strong></span>
              <span>Injuries: <strong style={{ color: totalInjury > 0 ? "#d97706" : "var(--ink)" }}>{totalInjury}</strong></span>
              <span>Tow-aways: <strong>{totalTow}</strong></span>
            </div>
          )}
          {crashes.length === 0 ? <EmptyState text="No crash records found." /> : (
            <DataTable
              headers={["Date", "State", "City", "Fatalities", "Injuries", "Tow Away", "Report #"]}
              rows={crashes.map((c) => [fmtDate(c.report_date), c.report_state ?? "—", c.city ?? "—", c.fatalities ?? "0", c.injuries ?? "0", c.tow_away ?? "0", c.report_number ?? "—"])}
              warnCol={3}
            />
          )}
        </section>

        {/* ── Feature 3: Insurance Continuity ──────────────────── */}
        <section>
          <SectionHeader title="Insurance Intelligence" count={insurance.length} />
          {insurance.length > 0 && (
            <div className="mb-4 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>BIPD Status</p>
                  <p className="text-sm font-semibold" style={{ color: insSummary.hasBipd ? (insSummary.isAdequate ? "#15803d" : "#d97706") : "#dc2626" }}>
                    {insSummary.hasBipd ? (insSummary.isAdequate ? "Adequate" : "Below Minimum") : "No BIPD Filed"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Coverage</p>
                  <p className="text-sm font-semibold">{fmtCurrency(insSummary.bipdCoverage)}</p>
                  <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>min: {fmtCurrency(insSummary.isHazmat ? 5000000 : 750000)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Insurers Used</p>
                  <p className="text-sm font-semibold" style={{ color: insSummary.uniqueInsurers.length >= 4 ? "#d97706" : "var(--ink)" }}>
                    {insSummary.uniqueInsurers.length}
                  </p>
                  {insSummary.uniqueInsurers.length >= 3 && <p className="text-[10px]" style={{ color: "#d97706" }}>Multiple insurer changes</p>}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Last Filing</p>
                  <p className="text-sm font-semibold">{insSummary.daysSinceLastFiling != null ? `${insSummary.daysSinceLastFiling}d ago` : "—"}</p>
                  {insSummary.daysSinceLastFiling != null && insSummary.daysSinceLastFiling > 365 && <p className="text-[10px]" style={{ color: "#dc2626" }}>Stale — over 1 year</p>}
                </div>
              </div>
              {insSummary.uniqueInsurers.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)" }}>Insurer History</p>
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{insSummary.uniqueInsurers.join(" → ")}</p>
                </div>
              )}
            </div>
          )}
          {insurance.length === 0 ? <EmptyState text="No insurance filings found." /> : (
            <DataTable
              headers={["Type", "Insurer", "Policy #", "Coverage", "Effective Date"]}
              rows={insurance.map((i) => [i.mod_col_1 ?? "—", i.name_company ?? "—", i.policy_no ?? "—", fmtCurrency(i.max_cov_amount || i.underl_lim_amount), fmtDate(i.effective_date)])}
            />
          )}
        </section>

        {/* ── Authority History ─────────────────────────────────── */}
        <section>
          <SectionHeader title="Authority History" count={authorityHistory.length} />
          {authorityHistory.length === 0 ? <EmptyState text="No authority history records found." /> : (
            <DataTable
              headers={["Docket", "Type", "Action", "Grant Date", "Disposition", "Disposition Date"]}
              rows={authorityHistory.map((a) => [a.docket_number ?? "—", a.mod_col_1 ?? "—", a.original_action_desc ?? "—", fmtDate(a.orig_served_date), a.disp_action_desc ?? "—", fmtDate(a.disp_served_date)])}
              warnCol={4} warnValues={["REVOKED", "SUSPENDED", "RESCINDED"]}
            />
          )}
        </section>

        {/* ── Equipment ────────────────────────────────────────── */}
        {(p(carrier.owntract) > 0 || p(carrier.owntruck) > 0 || p(carrier.owntrail) > 0 || p(carrier.trmtrail) > 0) && (
          <section>
            <SectionHeader title="Equipment (Census)" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {p(carrier.owntract) > 0 && <StatTile label="Owned Tractors" value={carrier.owntract!} />}
              {p(carrier.owntruck) > 0 && <StatTile label="Owned Trucks" value={carrier.owntruck!} />}
              {p(carrier.owntrail) > 0 && <StatTile label="Owned Trailers" value={carrier.owntrail!} />}
              {p(carrier.trmtrail) > 0 && <StatTile label="Term Trailers" value={carrier.trmtrail!} />}
            </div>
          </section>
        )}

        {/* ── Feature 7: Driver Migration ──────────────────────── */}
        {driverMigration.length > 0 && (
          <section>
            <SectionHeader title="Driver Migration" count={driverMigration.reduce((s, d) => s + d.sharedDrivers, 0)} />
            {driverChameleonFlag && (
              <div className="mb-3 rounded-lg border px-4 py-2 text-xs" style={{ borderColor: "var(--border)", background: "rgba(220,38,38,0.06)", color: "#991b1b" }}>
                50%+ of drivers shared with another carrier — possible chameleon continuity signal.
              </div>
            )}
            <DataTable
              headers={["Carrier", "DOT", "Status", "Shared Drivers"]}
              rows={driverMigration.map((dm) => [
                dm.legalName ?? "Unknown",
                String(dm.dotNumber),
                dm.statusCode ? decodeStatus(dm.statusCode) : "—",
                String(dm.sharedDrivers),
              ])}
              warnCol={2} warnValues={["OUT OF SERVICE", "INACTIVE", "NOT AUTHORIZED"]}
            />
          </section>
        )}

        {/* ── Feature 6: Enabler Risk ──────────────────────────── */}
        <section>
          <SectionHeader title="Enabler Risk Intelligence" />
          <EnablerRisk dotNumber={dotStr} />
        </section>

        {/* ── Feature 2: Entity Relationship Graph ─────────────── */}
        <section>
          <SectionHeader title="Entity Relationship Graph" />
          <NetworkGraph dotNumber={dotStr} />
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="pt-4 text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
          <p>Data sourced from FMCSA, USDOT, and Socrata open data. Socrata cached hourly. FMCSA cached 5 min. Page regenerates every 24 hours.</p>
          <p className="mt-1">
            <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>← Search another carrier</Link>
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

function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ background: bg, color: fg }}>{children}</span>;
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mb-3 text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
      {title}
      {count !== undefined && <span className="ml-2 text-sm font-normal" style={{ color: "var(--ink-muted)" }}>({count})</span>}
    </h2>
  );
}

function StatTile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-3 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
      <p className="text-lg font-bold tabular-nums" style={{ color: warn ? "#dc2626" : "var(--ink)" }}>{value}</p>
      <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>{text}</div>;
}

function Detail({ label, value, children }: { label: string; value: string | null | undefined; children?: React.ReactNode }) {
  if (!value) return null;
  return <div><span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>{label}: </span><span className="text-sm">{value}</span>{children}</div>;
}

function SignalCard({ severity, title, detail }: { severity: string; title: string; detail: string }) {
  const sc = SC[severity] ?? SC.low;
  return (
    <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.fg }}>{severity}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{detail}</p>
    </div>
  );
}

function DataTable({ headers, rows, warnCol, warnValues }: { headers: string[]; rows: string[][]; warnCol?: number; warnValues?: string[] }) {
  const shouldWarn = (ci: number, v: string) => {
    if (ci !== warnCol) return false;
    if (warnValues) return warnValues.some((w) => v.toUpperCase().includes(w));
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0;
  };
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--surface-1)" : "transparent" }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 whitespace-nowrap" style={{ borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : undefined, color: shouldWarn(ci, cell) ? "#dc2626" : "var(--ink-soft)", fontWeight: shouldWarn(ci, cell) ? 600 : undefined }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
