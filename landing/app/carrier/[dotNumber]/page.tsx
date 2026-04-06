/**
 * Public carrier SEO snapshot.
 *
 * Renders a thin static profile for crawlers and unauthenticated visitors:
 *   - Carrier identity (name, DOT, MC, address)
 *   - Headline verdict from CarrierVerdictCache (populated nightly by the
 *     agent watchdog) — falls back to a quick computed risk grade if missing
 *   - "Open Investigator" CTA that lands authed users on /console/[dotNumber]
 *
 * NOT a full intelligence dashboard — that's the agent console behind auth.
 * This page exists for SEO indexability and shareable links only.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarrierByDot } from "@/lib/socrata";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";
import { prisma } from "@/lib/prisma";

type Props = { params: { dotNumber: string } };

export const revalidate = 86400; // 24h ISR

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dot = params.dotNumber;
  if (!/^\d{1,10}$/.test(dot)) return { title: "Carrier Not Found | FleetSight" };
  const carrier = await getCarrierByDot(parseInt(dot, 10));
  if (!carrier) return { title: "Carrier Not Found | FleetSight" };

  return {
    title: `${carrier.legal_name} — DOT ${dot} | FleetSight`,
    description: `FleetSight intelligence profile for ${carrier.legal_name} (USDOT ${dot})${carrier.phy_state ? ` in ${carrier.phy_state}` : ""}. Open the agent for a verdict-first investigation with citations.`,
    openGraph: {
      title: `${carrier.legal_name} — DOT ${dot}`,
      description: `Verdict-first carrier intelligence powered by FleetSight's AI agent.`,
      type: "website",
    },
  };
}

type Verdict = "pass" | "watch" | "fail";

interface VerdictView {
  source: "cache" | "fallback";
  verdict: Verdict;
  headline: string;
  bullets: string[];
  generatedAt: string | null;
}

export default async function PublicCarrierPage({ params }: Props) {
  if (!/^\d{1,10}$/.test(params.dotNumber)) notFound();
  const dotNumberStr = params.dotNumber;
  const dotNumber = parseInt(dotNumberStr, 10);

  const [carrier, cached] = await Promise.all([
    getCarrierByDot(dotNumber),
    prisma.carrierVerdictCache.findUnique({ where: { dotNumber: dotNumberStr } }).catch(() => null),
  ]);

  if (!carrier) notFound();

  const verdictView = buildVerdictView(cached, carrier);
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
            href={`/console/${dotNumberStr}`}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Open Investigator →
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
        <VerdictCard view={verdictView} dotNumber={dotNumberStr} />

        {/* Quick stats (census fields only — no live FMCSA fetches) */}
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

        {/* CTA */}
        <div
          className="mt-6 rounded-xl border p-6 text-center"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
            See the full investigation
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
            FleetSight&apos;s AI agent runs a verdict-first investigation in seconds — chameleon detection,
            trust scoring, OOS analysis, insurance gaps, affiliation graphs.
          </p>
          <Link
            href={`/console/${dotNumberStr}`}
            className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Open Investigator →
          </Link>
        </div>

        <p className="mt-6 text-center text-[11px]" style={{ color: "var(--ink-muted)" }}>
          Public profile snapshot. Last verdict {verdictView.generatedAt ? `generated ${formatRel(verdictView.generatedAt)}` : "computed on this request"}.
        </p>
      </div>
    </main>
  );
}

function buildVerdictView(
  cached: { verdict: string; headline: string; bullets: string; confidence: number; generatedAt: Date } | null,
  carrier: { power_units?: string; total_drivers?: string; add_date?: string; mcs150_date?: string; status_code?: string }
): VerdictView {
  if (cached) {
    let bullets: string[] = [];
    try {
      const parsed = JSON.parse(cached.bullets);
      if (Array.isArray(parsed)) bullets = parsed.filter((b): b is string => typeof b === "string");
    } catch {
      bullets = [];
    }
    return {
      source: "cache",
      verdict: (cached.verdict as Verdict) || "watch",
      headline: cached.headline,
      bullets,
      generatedAt: cached.generatedAt.toISOString(),
    };
  }

  // Fallback: compute a quick grade from census fields and synthesize a headline
  const indicator = computeQuickRiskIndicator({
    powerUnits: parseIntOrUndef(carrier.power_units),
    totalDrivers: parseIntOrUndef(carrier.total_drivers),
    addDate: carrier.add_date,
    mcs150Date: carrier.mcs150_date,
    statusCode: carrier.status_code,
  });
  const verdict: Verdict = indicator.grade === "A" || indicator.grade === "B" ? "pass" : indicator.grade === "C" ? "watch" : "fail";
  const headline =
    verdict === "pass"
      ? "No headline risks detected from public registration data"
      : verdict === "watch"
      ? "Worth a closer look — open the Investigator for a full vetting"
      : "Elevated risk — open the Investigator immediately for full investigation";

  return {
    source: "fallback",
    verdict,
    headline,
    bullets: [
      `Quick risk grade ${indicator.grade} (score ${indicator.score})`,
      "This snapshot uses census fields only. The Investigator agent does a deeper sweep.",
    ],
    generatedAt: null,
  };
}

function VerdictCard({ view, dotNumber }: { view: VerdictView; dotNumber: string }) {
  const colors: Record<Verdict, { border: string; bg: string; fg: string; label: string }> = {
    pass: { border: "#16a34a", bg: "rgba(22, 163, 74, 0.10)", fg: "#15803d", label: "PASS" },
    watch: { border: "#d97757", bg: "rgba(217, 119, 87, 0.10)", fg: "#9a3412", label: "WATCH" },
    fail: { border: "#dc2626", bg: "rgba(220, 38, 38, 0.10)", fg: "#991b1b", label: "FAIL" },
  };
  const c = colors[view.verdict];
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
          {view.source === "cache" ? "from agent watchdog" : "from quick indicator"}
        </span>
      </div>
      <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>
        {view.headline}
      </h3>
      {view.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
          {view.bullets.slice(0, 4).map((b, i) => (
            <li key={i} className="flex gap-2">
              <span style={{ color: c.border }}>•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/console/${dotNumber}`}
        className="mt-4 inline-block text-xs font-medium underline"
        style={{ color: "var(--accent)" }}
      >
        Open the Investigator for the full evidence trail →
      </Link>
    </div>
  );
}

function parseIntOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function formatRel(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "recently";
  const ageHours = (Date.now() - t) / (1000 * 60 * 60);
  if (ageHours < 1) return "in the last hour";
  if (ageHours < 24) return `${Math.round(ageHours)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
}
