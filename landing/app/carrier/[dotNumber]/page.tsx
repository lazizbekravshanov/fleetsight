import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarrierByDot, getInspectionsByDot, getCrashesByDot } from "@/lib/socrata";
import { getCarrierBasics, getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import { decodeStatus, entityTypeBadge, decodeInspectionLevel } from "@/lib/fmcsa-codes";
import { computeQuickRiskIndicator } from "@/lib/risk-score";

type Props = { params: { dotNumber: string } };

/* ── Dynamic SEO metadata ─────────────────────────────────────────── */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dot = params.dotNumber;
  if (!/^\d{1,10}$/.test(dot)) return { title: "Carrier Not Found | FleetSight" };

  const carrier = await getCarrierByDot(parseInt(dot, 10));
  if (!carrier) return { title: "Carrier Not Found | FleetSight" };

  const name = carrier.legal_name;
  const state = carrier.phy_state ?? "";
  const units = carrier.power_units ? `${carrier.power_units} power units` : "";

  return {
    title: `${name} — DOT ${dot} | FleetSight`,
    description: `Safety profile for ${name} (USDOT ${dot})${state ? ` in ${state}` : ""}. ${units ? `Fleet: ${units}.` : ""} View inspections, crashes, insurance, BASIC scores, and chameleon detection signals.`,
    openGraph: {
      title: `${name} — DOT ${dot}`,
      description: `FMCSA carrier safety profile. Inspections, crashes, insurance, and compliance intelligence.`,
      type: "website",
    },
  };
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default async function PublicCarrierPage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotNumber = parseInt(params.dotNumber, 10);

  const [carrier, inspections, crashes] = await Promise.all([
    getCarrierByDot(dotNumber),
    getInspectionsByDot(dotNumber, 100).catch(() => []),
    getCrashesByDot(dotNumber, 50).catch(() => []),
  ]);

  if (!carrier) notFound();

  // Optional FMCSA live data
  let basics: unknown = null;
  let safetyRating: string | null = null;
  let allowedToOperate: string | null = null;
  try {
    const [basicsData, profile] = await Promise.all([
      getCarrierBasics(String(dotNumber)).catch(() => null),
      getCarrierProfile(String(dotNumber)).catch(() => null),
    ]);
    basics = basicsData;
    const record = extractCarrierRecord(profile);
    if (record) {
      const rating = record.safetyRating ?? record.safety_rating;
      if (rating && typeof rating === "string" && rating !== "None") safetyRating = rating;
      if (typeof record.allowedToOperate === "string") allowedToOperate = record.allowedToOperate;
    }
  } catch {}

  const badge = entityTypeBadge(carrier.classdef);
  const riskIndicator = computeQuickRiskIndicator({
    powerUnits: carrier.power_units ? parseInt(carrier.power_units, 10) : undefined,
    totalDrivers: carrier.total_drivers ? parseInt(carrier.total_drivers, 10) : undefined,
    addDate: carrier.add_date,
    mcs150Date: carrier.mcs150_date,
    statusCode: carrier.status_code,
  });

  const totalViols = inspections.reduce((s, i) => s + (parseInt(i.viol_total ?? "0", 10) || 0), 0);
  const totalOos = inspections.reduce((s, i) => s + (parseInt(i.oos_total ?? "0", 10) || 0), 0);
  const oosRate = inspections.length > 0 ? ((totalOos / inspections.length) * 100).toFixed(1) : null;
  const totalFatalities = crashes.reduce((s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0), 0);
  const totalInjuries = crashes.reduce((s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0), 0);

  // Extract BASIC scores
  type BasicEntry = { basicsId: number; basicsDescription: string; basicsPercentile: number };
  let basicScores: BasicEntry[] = [];
  if (basics && typeof basics === "object") {
    const obj = basics as Record<string, unknown>;
    const content = obj.content ?? obj;
    const measures = (content as Record<string, unknown>)?.basics ?? (content as Record<string, unknown>)?.basicsArray;
    if (Array.isArray(measures)) {
      basicScores = measures.map((m: Record<string, unknown>) => ({
        basicsId: Number(m.basicsId ?? m.basics_id ?? 0),
        basicsDescription: String(m.basicsDescription ?? m.basics_description ?? ""),
        basicsPercentile: Number(m.basicsPercentile ?? m.basics_percentile ?? 0),
      }));
    }
  }

  // Recent inspections (last 5)
  const recentInspections = inspections.slice(0, 5);

  // State distribution
  const stateCounts = new Map<string, number>();
  for (const insp of inspections) {
    const st = insp.report_state;
    if (st) stateCounts.set(st, (stateCounts.get(st) ?? 0) + 1);
  }
  const topStates = [...stateCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statusActive = carrier.status_code === "A" || allowedToOperate === "Y";

  return (
    <main className="min-h-screen bg-[var(--surface-2)] text-[var(--ink)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide text-accent hover:text-accent-hover transition-colors">
            FleetSight
          </Link>
          <Link
            href={`/?dot=${dotNumber}`}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            View Full Intelligence
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Carrier header */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  statusActive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                }`}>
                  {allowedToOperate === "Y" ? "Authorized" : allowedToOperate === "N" ? "Not Authorized" : decodeStatus(carrier.status_code)}
                </span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                  {badge.label}
                </span>
                {safetyRating && (
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink-soft)]">
                    Safety: {safetyRating}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
                {carrier.legal_name}
              </h1>
              {carrier.dba_name && (
                <p className="mt-0.5 text-sm text-[var(--ink-soft)]">DBA {carrier.dba_name}</p>
              )}
              <p className="mt-2 text-xs text-[var(--ink-muted)]">
                USDOT {dotNumber}
                {carrier.docket1 && <span className="ml-3">MC-{carrier.docket1}</span>}
                {carrier.phy_city && carrier.phy_state && (
                  <span className="ml-3">{carrier.phy_city}, {carrier.phy_state} {carrier.phy_zip}</span>
                )}
              </p>
            </div>
            {riskIndicator && (
              <div className={`rounded-xl px-4 py-3 text-center ${
                riskIndicator.grade === "A" ? "bg-emerald-50 ring-1 ring-emerald-200" :
                riskIndicator.grade === "B" ? "bg-emerald-50 ring-1 ring-emerald-200" :
                riskIndicator.grade === "C" ? "bg-amber-50 ring-1 ring-amber-200" :
                riskIndicator.grade === "D" ? "bg-orange-50 ring-1 ring-orange-200" :
                "bg-rose-50 ring-1 ring-rose-200"
              }`}>
                <p className="text-2xl font-bold">{riskIndicator.grade}</p>
                <p className="text-[10px] text-[var(--ink-muted)]">Risk Grade</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Power Units", value: carrier.power_units ?? "N/A" },
            { label: "Drivers", value: carrier.total_drivers ?? "N/A" },
            { label: "Inspections", value: inspections.length },
            { label: "Violations", value: totalViols },
            { label: "Crashes", value: crashes.length },
            { label: "OOS Rate", value: oosRate ? `${oosRate}%` : "N/A" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-center">
              <p className="text-lg font-bold text-[var(--ink)]">{s.value}</p>
              <p className="text-[10px] text-[var(--ink-muted)]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* BASIC Scores */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">BASIC Scores</h2>
            {basicScores.length > 0 ? (
              <div className="space-y-3">
                {basicScores.map((b) => (
                  <div key={b.basicsId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--ink-soft)]">{b.basicsDescription}</span>
                      <span className={`font-medium ${b.basicsPercentile >= 75 ? "text-rose-600" : b.basicsPercentile >= 50 ? "text-amber-600" : "text-[var(--ink)]"}`}>
                        {b.basicsPercentile}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.basicsPercentile >= 75 ? "bg-rose-500" : b.basicsPercentile >= 50 ? "bg-amber-500" : "bg-accent-soft0"
                        }`}
                        style={{ width: `${b.basicsPercentile}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">No BASIC scores available.</p>
            )}
          </div>

          {/* Crash summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Crash Summary</h2>
            {crashes.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${totalFatalities > 0 ? "text-rose-600" : "text-[var(--ink)]"}`}>{totalFatalities}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">Fatalities</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${totalInjuries > 0 ? "text-amber-600" : "text-[var(--ink)]"}`}>{totalInjuries}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">Injuries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--ink)]">{crashes.length}</p>
                    <p className="text-[10px] text-[var(--ink-muted)]">Total Crashes</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {crashes.slice(0, 5).map((c, i) => (
                    <div key={c.crash_id ?? i} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)] last:border-0">
                      <span className="text-[var(--ink-soft)]">{c.report_date ? new Date(c.report_date).toLocaleDateString() : "N/A"}</span>
                      <span className="text-[var(--ink-muted)]">{c.report_state}</span>
                      <span className={parseInt(c.fatalities ?? "0") > 0 ? "text-rose-600 font-medium" : "text-[var(--ink-muted)]"}>
                        {parseInt(c.fatalities ?? "0") > 0 ? `${c.fatalities} fatal` : parseInt(c.injuries ?? "0") > 0 ? `${c.injuries} inj` : "Tow-away"}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">No crash records found.</p>
            )}
          </div>

          {/* Recent inspections */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Recent Inspections</h2>
            {recentInspections.length > 0 ? (
              <div className="space-y-1.5">
                {recentInspections.map((insp, i) => (
                  <div key={insp.inspection_id ?? i} className="flex items-center justify-between text-xs py-1.5 border-b border-[var(--border)] last:border-0">
                    <span className="text-[var(--ink-soft)]">{insp.insp_date ? new Date(insp.insp_date).toLocaleDateString() : "N/A"}</span>
                    <span className="text-[var(--ink-muted)]">{insp.report_state}</span>
                    <span className="text-[var(--ink-muted)]">{decodeInspectionLevel(insp.insp_level_id)}</span>
                    <span className="text-[var(--ink)]">{insp.viol_total ?? 0} viols</span>
                    {(parseInt(insp.oos_total ?? "0") > 0) && (
                      <span className="text-rose-600 font-medium">{insp.oos_total} OOS</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">No inspection records found.</p>
            )}
          </div>

          {/* Top inspection states */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">Top Inspection States</h2>
            {topStates.length > 0 ? (
              <div className="space-y-2">
                {topStates.map(([state, count]) => (
                  <div key={state}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[var(--ink)]">{state}</span>
                      <span className="text-[var(--ink-soft)]">{count} inspection{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-accent-soft0"
                        style={{ width: `${(count / (topStates[0]?.[1] ?? 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-muted)]">No state data available.</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-xl border border-accent/30 bg-accent-soft/50 p-6 text-center">
          <h2 className="text-lg font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
            Get the complete intelligence picture
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            View chameleon detection, background checks, fleet VIN tracking, insurance history,
            affiliation networks, and AI-powered anomaly analysis — all free.
          </p>
          <Link
            href={`/?dot=${dotNumber}`}
            className="mt-4 inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            View Full Carrier Profile
          </Link>
        </div>

        {/* Embed badge */}
        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-2">Embed This Carrier&apos;s Badge</h2>
          <p className="text-xs text-[var(--ink-muted)] mb-3">
            Copy and paste this HTML to show this carrier&apos;s risk grade on your website.
          </p>
          <code className="block rounded-lg bg-[var(--surface-2)] p-3 text-[11px] text-[var(--ink-soft)] break-all select-all">
            {`<a href="https://fleetsight.vercel.app/carrier/${dotNumber}"><img src="https://fleetsight.vercel.app/api/v1/badge/${dotNumber}" alt="${carrier.legal_name} Safety Badge" /></a>`}
          </code>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-[var(--ink-muted)]">
          <p>Data sourced from FMCSA, DOT, and NHTSA public datasets. Updated daily.</p>
          <p className="mt-1">
            <Link href="/" className="text-accent hover:text-accent-hover">Search another carrier</Link>
            <span className="mx-2">|</span>
            <Link href="/dashboard" className="text-accent hover:text-accent-hover">Dashboard</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
