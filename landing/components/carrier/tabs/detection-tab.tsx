"use client";

import { SkeletonRows } from "../shared";
import type { DetectionData, AnomalyFlag } from "../types";

const SEVERITY: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  high:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  low:      { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" },
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

/* ── Section Header ────────────────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  color: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={color}>{icon}</span>
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
        {title}
      </h3>
      {count !== undefined && (
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${color} bg-gray-100 ring-1 ring-gray-200`}>
          {count}
        </span>
      )}
    </div>
  );
}

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="10" r="0.75" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 4.5V9.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 4.5V6C10 7.1 9.1 8 8 8H4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6H12.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 9H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5H6M8 5H9M5 7.5H6M8 7.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.5 12V10H8.5V12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M20 4L6 10V19C6 28.05 12.16 36.42 20 38C27.84 36.42 34 28.05 34 19V10L20 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
      <path d="M14 20L18 24L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Signal Summary Banner ─────────────────────────────────────────────── */

function SignalSummaryBanner({ data }: { data: DetectionData }) {
  const totalSignals =
    data.anomalyFlags.length +
    (data.authorityMill.isMillPattern ? 1 : 0) +
    (data.brokerReincarnation.isReincarnation ? 1 : 0) +
    data.sharedInsurance.length +
    (data.addressMatches && data.addressMatches.length > 0 ? 1 : 0);

  const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const flag of data.anomalyFlags) {
    severityCounts[flag.severity] = (severityCounts[flag.severity] || 0) + 1;
  }
  if (data.brokerReincarnation.isReincarnation) severityCounts.critical++;
  if (data.authorityMill.isMillPattern) severityCounts.high++;
  for (const _si of data.sharedInsurance) {
    severityCounts.medium++;
  }
  if (data.addressMatches && data.addressMatches.length > 0) severityCounts.medium++;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-extrabold tabular-nums text-gray-900">{totalSignals}</span>
        <span className="text-sm font-medium text-gray-500">
          detection signal{totalSignals !== 1 ? "s" : ""} found
        </span>
      </div>
      <div className="flex items-center gap-3">
        {SEVERITY_ORDER.map((sev) => {
          const count = severityCounts[sev];
          if (count === 0) return null;
          const s = SEVERITY[sev];
          return (
            <div key={sev} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className={`text-xs font-semibold tabular-nums ${s.text}`}>{count}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{sev}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Severity Distribution Bar ─────────────────────────────────────────── */

function SeverityBar({ flags }: { flags: AnomalyFlag[] }) {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of flags) counts[f.severity] = (counts[f.severity] || 0) + 1;
  const total = flags.length;
  if (total === 0) return null;

  const barColors: Record<string, string> = {
    critical: "bg-rose-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-gray-400",
  };

  return (
    <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
      {SEVERITY_ORDER.map((sev) => {
        const pct = (counts[sev] / total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={sev}
            className={`${barColors[sev]} transition-all`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Export
   ══════════════════════════════════════════════════════════════════════ */

export function DetectionTab({
  data,
  loading,
  error,
}: {
  data: DetectionData | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <SkeletonRows count={4} />;
  }

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-rose-400">{error}</p>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        Detection signals will load when this tab is selected.
      </p>
    );
  }

  const hasAnomalies = data.anomalyFlags.length > 0;
  const hasMill = data.authorityMill.isMillPattern;
  const hasReincarnation = data.brokerReincarnation.isReincarnation;
  const hasShared = data.sharedInsurance.length > 0;
  const hasAddress = (data.addressMatches ?? []).length > 0;
  const isEmpty = !hasAnomalies && !hasMill && !hasReincarnation && !hasShared && !hasAddress;

  if (isEmpty) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 text-emerald-600">
            <ShieldCheckIcon />
          </div>
          <p className="text-sm font-medium text-emerald-600">No detection signals found</p>
          <p className="mt-1.5 text-xs text-gray-400 max-w-xs mx-auto">
            This carrier has no anomaly flags, authority mill patterns, reincarnation signals, or shared insurance matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <SignalSummaryBanner data={data} />
      {data.aiExplanation && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-600/20">AI Analysis</span>
            <span className="text-[10px] text-gray-400">Generated by Claude</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{data.aiExplanation}</p>
        </div>
      )}
      {hasAnomalies && <AnomalyFlagsCard flags={data.anomalyFlags} />}
      {hasMill && <AuthorityMillCard mill={data.authorityMill} />}
      {hasReincarnation && <BrokerReincarnationCard reincarnation={data.brokerReincarnation} />}
      {hasAddress && <AddressCrossRefCard matches={data.addressMatches!} />}
      {hasShared && <SharedInsuranceCard policies={data.sharedInsurance} />}
    </div>
  );
}

/* ── Anomaly Flags ─────────────────────────────────────────────────────── */

function AnomalyFlagsCard({ flags }: { flags: AnomalyFlag[] }) {
  const highestSeverity = SEVERITY_ORDER.find((s) =>
    flags.some((f) => f.severity === s)
  );
  const glowClass =
    highestSeverity === "critical"
      ? ""
      : highestSeverity === "high"
        ? ""
        : "";

  return (
    <div className={`bg-white border border-gray-200 shadow-sm rounded-2xl p-5 ${glowClass}`}>
      <SectionHeader
        icon={<WarningIcon />}
        title="Anomaly Flags"
        count={flags.length}
        color="text-amber-400"
      />
      <SeverityBar flags={flags} />
      <div className="space-y-2">
        {flags.map((flag) => {
          const s = SEVERITY[flag.severity] ?? SEVERITY.low;
          return (
            <div
              key={flag.id}
              className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 ${s.bg} ${s.border}`}
            >
              <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
                    {flag.severity}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{flag.label}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{flag.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Authority Mill ────────────────────────────────────────────────────── */

function AuthorityMillCard({
  mill,
}: {
  mill: DetectionData["authorityMill"];
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<ClockIcon />}
        title="Authority Mill Pattern"
        color="text-orange-400"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Rapid authority grant/revoke cycles detected — potential mill operation.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: mill.grantCount, label: "Grants" },
          { value: mill.revokeCount, label: "Revocations" },
          { value: mill.avgDaysBetween, label: "Avg Days" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-orange-50 py-3 text-center">
            <p className="text-xl font-bold tabular-nums text-orange-700">{item.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Broker Reincarnation ──────────────────────────────────────────────── */

function BrokerReincarnationCard({
  reincarnation,
}: {
  reincarnation: DetectionData["brokerReincarnation"];
}) {
  const matchIndicators = [
    { key: "address", label: "Address", matched: reincarnation.addressMatch },
    { key: "phone", label: "Phone", matched: reincarnation.phoneMatch },
    { key: "officers", label: "Officers", matched: reincarnation.officerMatch },
  ];

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<BranchIcon />}
        title="Broker Reincarnation"
        color="text-rose-400"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Matches prior DOT on multiple fields — possible re-registration under new identity.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Prior DOT badge */}
        {reincarnation.priorDot && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 ring-1 ring-rose-200">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-rose-400">
              <rect x="2" y="3" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M4 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M4 8.5H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-medium text-gray-500">Prior DOT</span>
            <span className="text-sm font-bold tabular-nums text-rose-700">{reincarnation.priorDot}</span>
          </div>
        )}

        {/* Match strength indicators — always show all 3 */}
        <div className="flex items-center gap-3">
          {matchIndicators.map((m) => (
            <div key={m.key} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  m.matched
                    ? "bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                    : "bg-gray-100 text-gray-400 ring-1 ring-gray-200"
                }`}
              >
                {m.matched ? "\u2713" : "\u2014"}
              </div>
              <span className={`text-[10px] font-medium ${m.matched ? "text-rose-600" : "text-gray-400"}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Address Cross-Reference ──────────────────────────────────────────── */

function AddressCrossRefCard({
  matches,
}: {
  matches: NonNullable<DetectionData["addressMatches"]>;
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<BuildingIcon />}
        title="Address Cross-Reference"
        count={matches.length}
        color="text-purple-400"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Other carriers registered at the same physical address.
      </p>
      <div className="space-y-2">
        {matches.map((m) => (
          <div
            key={m.dotNumber}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{m.legalName}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">DOT {m.dotNumber}</p>
            </div>
            {m.statusCode && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  m.statusCode === "A"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                }`}
              >
                {m.statusCode === "A" ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared Insurance ──────────────────────────────────────────────────── */

function SharedInsuranceCard({
  policies,
}: {
  policies: DetectionData["sharedInsurance"];
}) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<CardIcon />}
        title="Shared Insurance"
        count={policies.length}
        color="text-amber-400"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Other carriers share the same insurance policies — potential chameleon signal.
      </p>
      <div className="space-y-2.5">
        {policies.map((si) => (
          <div
            key={si.policyNumber}
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700">{si.policyNumber}</span>
              <span className="text-[11px] text-gray-400">{si.insurerName}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {si.matchingCarriers && si.matchingCarriers.length > 0
                ? si.matchingCarriers.map((carrier) => (
                    <div
                      key={carrier.dotNumber}
                      className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] ring-1 ring-indigo-200 transition-colors hover:bg-indigo-100"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          carrier.statusCode === "A" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                      <span className="font-medium text-indigo-700 tabular-nums">DOT {carrier.dotNumber}</span>
                      <span className="text-gray-500 truncate max-w-[150px]">{carrier.legalName}</span>
                    </div>
                  ))
                : si.matchingDots.map((dot) => (
                    <span
                      key={dot}
                      className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-indigo-700 ring-1 ring-indigo-200 transition-colors hover:bg-indigo-100"
                    >
                      DOT {dot}
                    </span>
                  ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
