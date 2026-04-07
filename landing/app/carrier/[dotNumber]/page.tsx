/**
 * Public carrier intelligence page.
 *
 * The destination users land on after clicking a search result. Renders a
 * lean read-only intelligence snapshot from public FMCSA / Socrata data:
 *   - Carrier identity (name, DOT, MC, address)
 *   - Quick risk indicator + grade computed from census fields
 *   - Headline numbers (power units, drivers, MC)
 *
 * No dashboards, no agent console, no auth required.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarrierByDot } from "@/lib/socrata";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";

type Props = { params: { dotNumber: string } };

export const revalidate = 86400; // 24h ISR

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dot = params.dotNumber;
  if (!/^\d{1,10}$/.test(dot)) return { title: "Carrier Not Found | FleetSight" };
  const carrier = await getCarrierByDot(parseInt(dot, 10));
  if (!carrier) return { title: "Carrier Not Found | FleetSight" };

  return {
    title: `${carrier.legal_name} — DOT ${dot} | FleetSight`,
    description: `FleetSight intelligence profile for ${carrier.legal_name} (USDOT ${dot})${carrier.phy_state ? ` in ${carrier.phy_state}` : ""}.`,
    openGraph: {
      title: `${carrier.legal_name} — DOT ${dot}`,
      description: `Carrier intelligence powered by FleetSight.`,
      type: "website",
    },
  };
}

type Verdict = "pass" | "watch" | "fail";

export default async function PublicCarrierPage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotNumberStr = params.dotNumber;
  const dotNumber = parseInt(dotNumberStr, 10);

  const carrier = await getCarrierByDot(dotNumber);
  if (!carrier) notFound();

  const indicator = computeQuickRiskIndicator({
    powerUnits: parseIntOrUndef(carrier.power_units),
    totalDrivers: parseIntOrUndef(carrier.total_drivers),
    addDate: carrier.add_date,
    mcs150Date: carrier.mcs150_date,
    statusCode: carrier.status_code,
  });
  const verdict: Verdict =
    indicator.grade === "A" || indicator.grade === "B"
      ? "pass"
      : indicator.grade === "C"
      ? "watch"
      : "fail";
  const headline =
    verdict === "pass"
      ? "No headline risks detected from public registration data"
      : verdict === "watch"
      ? "Worth a closer look — review safety and inspection history"
      : "Elevated risk — review safety, inspections, and authority history";

  const badge = entityTypeBadge(carrier.classdef);
  const statusActive = carrier.status_code === "A";

  return (
    <main className="min-h-screen" style={{ background: "var(--surface-2)", color: "var(--ink)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            FleetSight
          </Link>
          <Link
            href="/"
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--ink-soft)" }}
          >
            ← Back to search
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Carrier identity */}
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: statusActive ? "rgba(22, 163, 74, 0.10)" : "rgba(220, 38, 38, 0.10)",
                color: statusActive ? "#15803d" : "#991b1b",
              }}
            >
              {decodeStatus(carrier.status_code)}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {badge.label}
            </span>
          </div>

          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--ink)", fontFamily: "var(--font-serif)" }}
          >
            {carrier.legal_name}
          </h1>
          {carrier.dba_name && (
            <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
              DBA {carrier.dba_name}
            </p>
          )}
          <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            USDOT {dotNumberStr}
            {carrier.docket1 && <span className="ml-3">MC-{carrier.docket1}</span>}
            {carrier.phy_city && carrier.phy_state && (
              <span className="ml-3">
                {carrier.phy_city}, {carrier.phy_state} {carrier.phy_zip}
              </span>
            )}
          </p>
        </div>

        {/* Verdict card */}
        <VerdictCard verdict={verdict} headline={headline} grade={indicator.grade} score={indicator.score} />

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Power Units", value: carrier.power_units ?? "—" },
            { label: "Drivers", value: carrier.total_drivers ?? "—" },
            { label: "MC Number", value: carrier.docket1 ? `MC-${carrier.docket1}` : "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border px-4 py-3 text-center"
              style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
            >
              <p className="text-lg font-bold" style={{ color: "var(--ink)" }}>
                {s.value}
              </p>
              <p className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
          Computed from public FMCSA registration data. Snapshot is cached for 24 hours.
        </p>
      </div>
    </main>
  );
}

function VerdictCard({
  verdict,
  headline,
  grade,
  score,
}: {
  verdict: Verdict;
  headline: string;
  grade: string;
  score: number;
}) {
  const colors: Record<Verdict, { border: string; bg: string; fg: string; label: string }> = {
    pass: { border: "#16a34a", bg: "rgba(22, 163, 74, 0.10)", fg: "#15803d", label: "PASS" },
    watch: { border: "#d97757", bg: "rgba(217, 119, 87, 0.10)", fg: "#9a3412", label: "WATCH" },
    fail: { border: "#dc2626", bg: "rgba(220, 38, 38, 0.10)", fg: "#991b1b", label: "FAIL" },
  };
  const c = colors[verdict];
  return (
    <div
      className="mt-4 rounded-xl border-2 p-5"
      style={{ borderColor: c.border, background: "var(--surface-1)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded-md px-3 py-1 text-xs font-bold tracking-widest"
          style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}
        >
          {c.label}
        </span>
        <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>
          quick risk indicator
        </span>
      </div>
      <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
        {headline}
      </h3>
      <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
        <li className="flex gap-2">
          <span style={{ color: c.border }}>•</span>
          <span>Quick risk grade {grade} (score {score})</span>
        </li>
        <li className="flex gap-2">
          <span style={{ color: c.border }}>•</span>
          <span>Computed from registration census fields only.</span>
        </li>
      </ul>
    </div>
  );
}

function parseIntOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}
