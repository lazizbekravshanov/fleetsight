/**
 * Full carrier intelligence page.
 *
 * Single scrollable page showing everything FleetSight knows about a carrier:
 * identity, risk assessment, fraud signals, BASIC scores, inspections, crashes,
 * insurance, and authority history. All data fetched server-side in parallel.
 *
 * No tabs, no dashboard, no auth required.
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

type Props = { params: { dotNumber: string } };

export const revalidate = 86400; // 24h ISR

/* ── Metadata ────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dot = params.dotNumber;
  if (!/^\d{1,10}$/.test(dot)) return { title: "Carrier Not Found | FleetSight" };
  const carrier = await getCarrierByDot(parseInt(dot, 10));
  if (!carrier) return { title: "Carrier Not Found | FleetSight" };

  return {
    title: `${carrier.legal_name} — DOT ${dot} | FleetSight`,
    description: `Full intelligence profile for ${carrier.legal_name} (USDOT ${dot})${carrier.phy_state ? ` in ${carrier.phy_state}` : ""}. Safety scores, inspections, crashes, insurance, fraud signals.`,
    openGraph: {
      title: `${carrier.legal_name} — DOT ${dot}`,
      description: `Carrier intelligence: safety, inspections, crashes, insurance, fraud signals.`,
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

const VERDICT_COLORS: Record<Verdict, { border: string; bg: string; fg: string; label: string }> = {
  pass: { border: "#16a34a", bg: "rgba(22, 163, 74, 0.10)", fg: "#15803d", label: "PASS" },
  watch: { border: "#d97757", bg: "rgba(217, 119, 87, 0.10)", fg: "#9a3412", label: "WATCH" },
  fail: { border: "#dc2626", bg: "rgba(220, 38, 38, 0.10)", fg: "#991b1b", label: "FAIL" },
};

const SEV_COLORS: Record<string, { bg: string; fg: string }> = {
  critical: { bg: "rgba(220, 38, 38, 0.12)", fg: "#991b1b" },
  high: { bg: "rgba(217, 119, 87, 0.14)", fg: "#9a3412" },
  medium: { bg: "rgba(202, 138, 4, 0.12)", fg: "#854d0e" },
  low: { bg: "rgba(100, 116, 139, 0.12)", fg: "#475569" },
};

/* ── Page ────────────────────────────────────────────────────────── */

export default async function CarrierIntelligencePage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotStr = params.dotNumber;
  const dotNum = parseInt(dotStr, 10);

  // Phase 1: carrier identity (must succeed)
  const carrier = await getCarrierByDot(dotNum);
  if (!carrier) notFound();

  // Phase 2: all other data in parallel (error-tolerant)
  const [inspR, crashR, insR, authR, basicsR, profileR, priorR] = await Promise.allSettled([
    getInspectionsByDot(dotNum, 100),
    getCrashesByDot(dotNum, 50),
    getInsuranceByDot(dotNum, 50),
    getAuthorityHistoryByDot(dotNum, 50),
    getCarrierBasics(dotStr).catch(() => null),
    getCarrierProfile(dotStr).catch(() => null),
    carrier.prior_revoke_flag === "Y" && carrier.prior_revoke_dot
      ? getCarrierByDot(parseInt(carrier.prior_revoke_dot, 10))
      : Promise.resolve(null),
  ]);

  const inspections = settled(inspR, [] as SocrataInspection[]);
  const crashes = settled(crashR, [] as SocrataCrash[]);
  const insurance = settled(insR, [] as SocrataInsurance[]);
  const authorityHistory = settled(authR, [] as SocrataAuthorityHistory[]);
  const basicsPayload = settled(basicsR, null);
  const profilePayload = settled(profileR, null);
  const priorCarrier = settled(priorR, null);

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
  const verdict: Verdict =
    indicator.grade === "A" || indicator.grade === "B" ? "pass"
    : indicator.grade === "C" ? "watch"
    : "fail";

  const signals = computeAllSignals({ carrier, insurance, authorityHistory, priorCarrier });
  const voip = checkVoipIndicators(carrier.phone);

  // Inspection stats
  const totalViols = inspections.reduce((s, i) => s + p(i.viol_total), 0);
  const totalOos = inspections.reduce((s, i) => s + p(i.oos_total), 0);
  const driverOos = inspections.reduce((s, i) => s + p(i.driver_oos_total), 0);
  const vehicleOos = inspections.reduce((s, i) => s + p(i.vehicle_oos_total), 0);
  const oosRate = inspections.length > 0 ? ((totalOos / inspections.length) * 100).toFixed(1) : "N/A";

  // Crash stats
  const totalFatal = crashes.reduce((s, c) => s + p(c.fatalities), 0);
  const totalInjury = crashes.reduce((s, c) => s + p(c.injuries), 0);
  const totalTow = crashes.reduce((s, c) => s + p(c.tow_away), 0);

  const badge = entityTypeBadge(carrier.classdef);
  const statusActive = carrier.status_code === "A";
  const cargoTypes = carrier.carship ? decodeCarship(carrier.carship) : [];
  const operationType = carrier.carrier_operation ? decodeOperation(carrier.carrier_operation) : null;
  const fleetSizeLabel = carrier.fleetsize ? decodeFleetSize(carrier.fleetsize) : null;
  const vc = VERDICT_COLORS[verdict];

  const hasAnySignals = signals.anomalyFlags.length > 0 || signals.authorityMill.isMillPattern || signals.brokerReincarnation.isReincarnation || voip.isLikelyVoip;

  return (
    <main className="min-h-screen" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide" style={{ color: "var(--accent)" }}>
            FleetSight
          </Link>
          <Link href="/" className="text-xs font-medium hover:underline" style={{ color: "var(--ink-soft)" }}>
            ← Back to search
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">

        {/* ── Section 1: Identity ──────────────────────────────── */}
        <section className="rounded-xl border p-6" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ background: statusActive ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)", color: statusActive ? "#15803d" : "#991b1b" }}>
              {decodeStatus(carrier.status_code)}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {badge.label}
            </span>
            {carrier.hm_ind === "Y" && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(220,38,38,0.10)", color: "#991b1b" }}>
                HAZMAT
              </span>
            )}
            {safetyRating && (
              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{ background: "rgba(59,130,246,0.12)", color: "#1d4ed8" }}>
                Rating: {safetyRating}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            {carrier.legal_name}
          </h1>
          {carrier.dba_name && <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>DBA {carrier.dba_name}</p>}

          <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2" style={{ color: "var(--ink-soft)" }}>
            <Detail label="USDOT" value={dotStr} />
            <Detail label="MC Number" value={carrier.docket1 ? `${carrier.docket1prefix ?? "MC"}-${carrier.docket1}` : null} />
            <Detail label="Address" value={[carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(", ") || null} />
            <Detail label="Phone" value={carrier.phone}>
              {voip.isLikelyVoip && (
                <span className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(220,38,38,0.10)", color: "#991b1b" }}>
                  VoIP {voip.provider ? `(${voip.provider})` : ""}
                </span>
              )}
            </Detail>
            <Detail label="Principal 1" value={carrier.company_officer_1} />
            <Detail label="Principal 2" value={carrier.company_officer_2} />
            <Detail label="Operation" value={operationType} />
            <Detail label="Fleet Size" value={fleetSizeLabel ? `${fleetSizeLabel} units` : null} />
            <Detail label="Authority Date" value={fmtDate(carrier.add_date)} />
            <Detail label="MCS-150 Updated" value={fmtDate(carrier.mcs150_date)} />
            {carrier.mcs150_mileage && (
              <Detail label="Annual Mileage" value={`${parseInt(carrier.mcs150_mileage, 10).toLocaleString()} mi (${carrier.mcs150_mileage_year ?? ""})`} />
            )}
            {cargoTypes.length > 0 && (
              <div className="sm:col-span-2">
                <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>Cargo: </span>
                <span className="text-xs">{cargoTypes.join(", ")}</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Summary Stats ─────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <StatTile label="Power Units" value={carrier.power_units ?? "—"} />
          <StatTile label="Drivers" value={carrier.total_drivers ?? "—"} />
          <StatTile label="Inspections" value={String(inspections.length)} />
          <StatTile label="Violations" value={String(totalViols)} warn={totalViols > 0} />
          <StatTile label="Crashes" value={String(crashes.length)} warn={crashes.length > 0} />
          <StatTile label="OOS Rate" value={oosRate === "N/A" ? "—" : `${oosRate}%`} warn={oosRate !== "N/A" && parseFloat(oosRate) > 10} />
        </div>

        {/* ── Section 3: Risk Assessment ───────────────────────── */}
        <section className="rounded-xl border-2 p-5" style={{ borderColor: vc.border, background: "var(--surface-1)" }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-md px-3 py-1 text-xs font-bold tracking-widest"
              style={{ background: vc.bg, color: vc.fg, border: `1px solid ${vc.border}` }}>
              {vc.label}
            </span>
            <span className="text-xs font-semibold" style={{ color: vc.fg }}>
              Grade {indicator.grade} — Score {indicator.score}
            </span>
          </div>
          <h3 className="text-base font-semibold">
            {verdict === "pass" ? "No headline risks detected from public data"
              : verdict === "watch" ? "Worth a closer look — review safety and inspection history"
              : "Elevated risk — review safety, inspections, and authority history"}
          </h3>
        </section>

        {/* ── Section 4: Fraud & Anomaly Signals ───────────────── */}
        <section>
          <SectionHeader title="Fraud & Anomaly Signals" count={hasAnySignals ? undefined : 0} />
          {!hasAnySignals ? (
            <div className="rounded-xl border p-4 text-center text-sm"
              style={{ borderColor: "#16a34a", background: "rgba(22,163,74,0.06)", color: "#15803d" }}>
              No fraud or anomaly signals detected.
            </div>
          ) : (
            <div className="space-y-2">
              {signals.anomalyFlags.map((f, i) => {
                const sc = SEV_COLORS[f.severity] ?? SEV_COLORS.low;
                return (
                  <div key={i} className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: sc.bg, color: sc.fg }}>
                        {f.severity}
                      </span>
                      <span className="text-sm font-semibold">{f.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{f.detail}</p>
                  </div>
                );
              })}
              {signals.authorityMill.isMillPattern && (
                <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEV_COLORS.high.bg, color: SEV_COLORS.high.fg }}>HIGH</span>
                    <span className="text-sm font-semibold">Authority Mill Pattern</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    {signals.authorityMill.grantCount} grants, {signals.authorityMill.revokeCount} revocations, avg {Math.round(signals.authorityMill.avgDaysBetween)} days between cycles.
                  </p>
                </div>
              )}
              {signals.brokerReincarnation.isReincarnation && (
                <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEV_COLORS.critical.bg, color: SEV_COLORS.critical.fg }}>CRITICAL</span>
                    <span className="text-sm font-semibold">Broker Reincarnation Detected</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    Matches prior DOT {signals.brokerReincarnation.priorDot}
                    {signals.brokerReincarnation.addressMatch ? " — address match" : ""}
                    {signals.brokerReincarnation.phoneMatch ? " — phone match" : ""}
                    {signals.brokerReincarnation.officerMatch ? " — officer match" : ""}.
                  </p>
                </div>
              )}
              {voip.isLikelyVoip && (
                <div className="rounded-lg border px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: SEV_COLORS.medium.bg, color: SEV_COLORS.medium.fg }}>MEDIUM</span>
                    <span className="text-sm font-semibold">VoIP Phone Detected</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    {voip.reason ?? "Phone number matches known VoIP provider patterns"}{voip.provider ? ` (${voip.provider})` : ""}.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 5: BASIC Scores ──────────────────────────── */}
        <section>
          <SectionHeader title="BASIC Scores" />
          {basics.length === 0 ? (
            <EmptyState text="BASIC score data not available for this carrier." />
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              {basics.map((b, i) => {
                const pct = Math.min(b.percentile, 100);
                const barColor = pct >= 75 ? "#dc2626" : pct >= 50 ? "#d97706" : "#16a34a";
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                    <span className="w-44 shrink-0 text-sm font-medium truncate">{b.name}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold tabular-nums" style={{ color: barColor }}>
                      {pct}%
                    </span>
                    {b.rdDeficient && (
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(220,38,38,0.12)", color: "#991b1b" }}>
                        ALERT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section 6: Inspections ───────────────────────────── */}
        <section>
          <SectionHeader title="Inspections" count={inspections.length} />
          {inspections.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span>Total violations: <strong style={{ color: "var(--ink)" }}>{totalViols}</strong></span>
              <span>Total OOS: <strong style={{ color: "var(--ink)" }}>{totalOos}</strong></span>
              <span>Driver OOS: <strong>{driverOos}</strong></span>
              <span>Vehicle OOS: <strong>{vehicleOos}</strong></span>
              <span>OOS rate: <strong style={{ color: parseFloat(oosRate) > 10 ? "#dc2626" : "var(--ink)" }}>{oosRate}%</strong></span>
            </div>
          )}
          {inspections.length === 0 ? (
            <EmptyState text="No inspection records found." />
          ) : (
            <DataTable
              headers={["Date", "State", "Level", "Violations", "OOS", "Driver Viols", "Vehicle Viols", "Location"]}
              rows={inspections.slice(0, 25).map((i) => [
                fmtDate(i.insp_date),
                i.report_state ?? "—",
                i.insp_level_id ? decodeInspectionLevel(i.insp_level_id) : "—",
                i.viol_total ?? "0",
                i.oos_total ?? "0",
                i.driver_viol_total ?? "0",
                i.vehicle_viol_total ?? "0",
                i.location_desc ?? "—",
              ])}
              warnCol={4}
            />
          )}
          {inspections.length > 25 && (
            <p className="mt-2 text-xs text-center" style={{ color: "var(--ink-muted)" }}>
              Showing 25 of {inspections.length} inspections.
            </p>
          )}
        </section>

        {/* ── Section 7: Crashes ────────────────────────────────── */}
        <section>
          <SectionHeader title="Crashes" count={crashes.length} />
          {crashes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-4 text-xs" style={{ color: "var(--ink-muted)" }}>
              <span>Fatalities: <strong style={{ color: totalFatal > 0 ? "#dc2626" : "var(--ink)" }}>{totalFatal}</strong></span>
              <span>Injuries: <strong style={{ color: totalInjury > 0 ? "#d97706" : "var(--ink)" }}>{totalInjury}</strong></span>
              <span>Tow-aways: <strong>{totalTow}</strong></span>
            </div>
          )}
          {crashes.length === 0 ? (
            <EmptyState text="No crash records found." />
          ) : (
            <DataTable
              headers={["Date", "State", "City", "Fatalities", "Injuries", "Tow Away", "Report #"]}
              rows={crashes.map((c) => [
                fmtDate(c.report_date),
                c.report_state ?? "—",
                c.city ?? "—",
                c.fatalities ?? "0",
                c.injuries ?? "0",
                c.tow_away ?? "0",
                c.report_number ?? "—",
              ])}
              warnCol={3}
            />
          )}
        </section>

        {/* ── Section 8: Insurance ─────────────────────────────── */}
        <section>
          <SectionHeader title="Insurance Filings" count={insurance.length} />
          {insurance.length === 0 ? (
            <EmptyState text="No insurance filings found." />
          ) : (
            <DataTable
              headers={["Type", "Insurer", "Policy #", "Coverage", "Effective Date"]}
              rows={insurance.map((i) => [
                i.mod_col_1 ?? "—",
                i.name_company ?? "—",
                i.policy_no ?? "—",
                fmtCurrency(i.max_cov_amount || i.underl_lim_amount),
                fmtDate(i.effective_date),
              ])}
            />
          )}
        </section>

        {/* ── Section 9: Authority History ──────────────────────── */}
        <section>
          <SectionHeader title="Authority History" count={authorityHistory.length} />
          {authorityHistory.length === 0 ? (
            <EmptyState text="No authority history records found." />
          ) : (
            <DataTable
              headers={["Docket", "Type", "Action", "Grant Date", "Disposition", "Disposition Date"]}
              rows={authorityHistory.map((a) => [
                a.docket_number ?? "—",
                a.mod_col_1 ?? "—",
                a.original_action_desc ?? "—",
                fmtDate(a.orig_served_date),
                a.disp_action_desc ?? "—",
                fmtDate(a.disp_served_date),
              ])}
              warnCol={4}
              warnValues={["REVOKED", "SUSPENDED", "RESCINDED"]}
            />
          )}
        </section>

        {/* ── Section 10: Equipment Summary ─────────────────────── */}
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

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="pt-4 text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
          <p>
            Data sourced from FMCSA, USDOT, and Socrata open data.
            Socrata snapshots cached hourly. FMCSA live data cached 5 minutes.
            Page regenerates every 24 hours.
          </p>
          <p className="mt-1">
            <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>← Search another carrier</Link>
            {" · "}
            <Link href="/blog" style={{ color: "var(--accent)", textDecoration: "none" }}>Blog</Link>
            {" · "}
            <Link href="/terms" style={{ color: "var(--accent)", textDecoration: "none" }}>Terms</Link>
            {" · "}
            <Link href="/privacy" style={{ color: "var(--accent)", textDecoration: "none" }}>Privacy</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ── Reusable Section Components ─────────────────────────────────── */

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mb-3 text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
      {title}
      {count !== undefined && (
        <span className="ml-2 text-sm font-normal" style={{ color: "var(--ink-muted)" }}>
          ({count} {count === 1 ? "record" : "records"})
        </span>
      )}
    </h2>
  );
}

function StatTile({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-3 text-center"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
      <p className="text-lg font-bold tabular-nums" style={{ color: warn ? "#dc2626" : "var(--ink)" }}>
        {value}
      </p>
      <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm"
      style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>
      {text}
    </div>
  );
}

function Detail({ label, value, children }: { label: string; value: string | null | undefined; children?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>{label}: </span>
      <span className="text-sm">{value}</span>
      {children}
    </div>
  );
}

function DataTable({
  headers,
  rows,
  warnCol,
  warnValues,
}: {
  headers: string[];
  rows: string[][];
  warnCol?: number;
  warnValues?: string[];
}) {
  const shouldWarn = (colIdx: number, value: string) => {
    if (colIdx !== warnCol) return false;
    if (warnValues) return warnValues.some((w) => value.toUpperCase().includes(w));
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0;
  };

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--surface-1)" : "transparent" }}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 whitespace-nowrap"
                  style={{
                    borderBottom: ri < rows.length - 1 ? "1px solid var(--border)" : undefined,
                    color: shouldWarn(ci, cell) ? "#dc2626" : "var(--ink-soft)",
                    fontWeight: shouldWarn(ci, cell) ? 600 : undefined,
                  }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
