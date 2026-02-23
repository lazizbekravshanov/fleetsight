"use client";

import { SkeletonRows } from "../shared";
import type { DetectionData, AnomalyFlag } from "../types";

const SEVERITY: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
  high:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  low:      { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-400/20", dot: "bg-slate-500" },
};

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
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
        Detection signals will load when this tab is selected.
      </p>
    );
  }

  const hasAnomalies = data.anomalyFlags.length > 0;
  const hasMill = data.authorityMill.isMillPattern;
  const hasReincarnation = data.brokerReincarnation.isReincarnation;
  const hasShared = data.sharedInsurance.length > 0;
  const isEmpty = !hasAnomalies && !hasMill && !hasReincarnation && !hasShared;

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-panel">
        <p className="text-sm text-emerald-400 font-medium">No detection signals found</p>
        <p className="mt-1 text-xs text-slate-500">
          This carrier has no anomaly flags, authority mill patterns, reincarnation signals, or shared insurance matches.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasAnomalies && <AnomalyFlagsCard flags={data.anomalyFlags} />}
      {hasMill && <AuthorityMillCard mill={data.authorityMill} />}
      {hasReincarnation && <BrokerReincarnationCard reincarnation={data.brokerReincarnation} />}
      {hasShared && <SharedInsuranceCard policies={data.sharedInsurance} />}
    </div>
  );
}

/* -- Anomaly Flags -------------------------------------------------------- */

function AnomalyFlagsCard({ flags }: { flags: AnomalyFlag[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Anomaly Flags
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          {flags.length}
        </span>
      </h3>
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
                  <span className="text-sm font-medium text-slate-200">{flag.label}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{flag.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -- Authority Mill ------------------------------------------------------- */

function AuthorityMillCard({
  mill,
}: {
  mill: DetectionData["authorityMill"];
}) {
  return (
    <div className="rounded-xl border border-orange-500/20 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />
        Authority Mill Pattern
      </h3>
      <p className="mb-4 text-xs text-slate-500">
        Rapid authority grant/revoke cycles detected — potential mill operation.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: mill.grantCount, label: "Grants" },
          { value: mill.revokeCount, label: "Revocations" },
          { value: mill.avgDaysBetween, label: "Avg Days" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-orange-500/10 py-2.5 text-center">
            <p className="text-xl font-bold tabular-nums text-orange-300">{item.value}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -- Broker Reincarnation ------------------------------------------------- */

function BrokerReincarnationCard({
  reincarnation,
}: {
  reincarnation: DetectionData["brokerReincarnation"];
}) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-rose-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
        Broker Reincarnation Detected
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Matches prior DOT on multiple fields — possible re-registration under new identity.
      </p>
      <div className="flex flex-wrap gap-2">
        {reincarnation.priorDot && (
          <span className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-rose-500/20">
            Prior DOT: {reincarnation.priorDot}
          </span>
        )}
        {[
          { match: reincarnation.addressMatch, label: "Address" },
          { match: reincarnation.phoneMatch, label: "Phone" },
          { match: reincarnation.officerMatch, label: "Officers" },
        ]
          .filter((m) => m.match)
          .map((m) => (
            <span
              key={m.label}
              className="rounded-lg bg-slate-800/50 px-2.5 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-slate-700/50"
            >
              {m.label} Match
            </span>
          ))}
      </div>
    </div>
  );
}

/* -- Shared Insurance ----------------------------------------------------- */

function SharedInsuranceCard({
  policies,
}: {
  policies: DetectionData["sharedInsurance"];
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
        Shared Insurance
        <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
          {policies.length}
        </span>
      </h3>
      <p className="mb-3 text-xs text-slate-500">
        Other carriers share the same insurance policies — potential chameleon signal.
      </p>
      <div className="space-y-2">
        {policies.map((si) => (
          <div
            key={si.policyNumber}
            className="rounded-lg border border-slate-800 bg-slate-950/50 px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400">{si.policyNumber}</span>
              <span className="text-[11px] text-slate-500">{si.insurerName}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {si.matchingDots.map((dot) => (
                <span
                  key={dot}
                  className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-blue-400 ring-1 ring-slate-700/40"
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
