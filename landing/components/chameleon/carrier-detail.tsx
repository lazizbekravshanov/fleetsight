"use client";

import { useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────

type AnomalyFlag = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  detail: string;
};

type SignalsData = {
  anomalyFlags: AnomalyFlag[];
  authorityMill: {
    grantCount: number;
    revokeCount: number;
    avgDaysBetween: number;
    isMillPattern: boolean;
  };
  brokerReincarnation: {
    priorDot: number | null;
    addressMatch: boolean;
    phoneMatch: boolean;
    officerMatch: boolean;
    isReincarnation: boolean;
  };
  sharedInsurance: {
    policyNumber: string;
    insurerName: string;
    matchingDots: number[];
  }[];
};

type CarrierData = {
  carrier: {
    dotNumber: number;
    legalName: string;
    dbaName: string | null;
    phyStreet: string | null;
    phyCity: string | null;
    phyState: string | null;
    phyZip: string | null;
    phone: string | null;
    statusCode: string | null;
    priorRevokeFlag: string | null;
    priorRevokeDot: number | null;
    addDate: string | null;
    powerUnits: number | null;
    totalDrivers: number | null;
    companyOfficer1: string | null;
    companyOfficer2: string | null;
  };
  riskScore: {
    chameleonScore: number;
    safetyScore: number;
    compositeScore: number;
    signals: string[];
    clusterSize: number;
  } | null;
  crashes: {
    reportDate: string | null;
    reportNumber: string | null;
    state: string | null;
    fatalities: number;
    injuries: number;
    towAway: boolean;
  }[];
  links: {
    otherDotNumber: number;
    otherLegalName: string;
    otherStatusCode: string | null;
    score: number;
    reasons: { feature: string; value: string; contribution: number }[];
  }[];
  clusterMembers: {
    dotNumber: number;
    legalName: string;
    statusCode: string | null;
  }[];
};

// ── Severity config ──────────────────────────────────────────────

const SEVERITY: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-500" },
  high:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", dot: "bg-orange-500" },
  medium:   { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  low:      { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-400/20", dot: "bg-slate-500" },
};

// ── Sub-components ───────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card-elevated animate-fade-in rounded-2xl p-5">
      <div className="space-y-3">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer h-5 w-48 rounded" />
        <div className="shimmer h-3 w-64 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="shimmer h-6 w-16 rounded-md" />
          <div className="shimmer h-6 w-20 rounded-md" />
          <div className="shimmer h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  color = "text-slate-400",
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={color}>{icon}</span>
      <h3 className="text-[13px] font-semibold text-white">{title}</h3>
      {count != null && (
        <span className="rounded-md bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500">
          {count}
        </span>
      )}
    </div>
  );
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.max(0, Math.min(100, score));
  const color =
    pct >= 70 ? "#f43f5e" : pct >= 30 ? "#f59e0b" : "#10b981";
  const circumference = 157;
  const filled = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 120 70" className="h-[60px] w-[100px]">
          {/* Track */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.8s ease-out" }}
          />
          {/* Score text */}
          <text
            x="60"
            y="56"
            textAnchor="middle"
            fontSize="18"
            fontWeight="600"
            fill={color}
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {pct.toFixed(0)}
          </text>
        </svg>
      </div>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function MetaBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "active" | "danger" }) {
  const styles = {
    default: "bg-slate-800/60 text-slate-400",
    active: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function CarrierDetail({
  dotNumber,
  onSelectDot,
}: {
  dotNumber: number;
  onSelectDot: (dot: number) => void;
}) {
  const [data, setData] = useState<CarrierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<SignalsData | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSignals(null);
    fetch(`/api/chameleon/carriers/${dotNumber}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dotNumber]);

  useEffect(() => {
    if (!data) return;
    setSignalsLoading(true);
    fetch(`/api/chameleon/carriers/${dotNumber}/signals`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => setSignals(d))
      .catch(() => {})
      .finally(() => setSignalsLoading(false));
  }, [data, dotNumber]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <div className="card-elevated rounded-2xl p-5">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="shimmer h-[60px] w-[100px] rounded" />
                <div className="shimmer h-2 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="animate-fade-in rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-rose-400">
              <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 6v4M9 12.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-rose-300">Failed to load carrier</p>
            <p className="text-xs text-rose-400/70">{error || "Carrier not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const { carrier, riskScore, crashes, links, clusterMembers } = data;

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── Header Card ─────────────────────────────────────────── */}
      <div className="card-elevated rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            {/* DOT label */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tabular-nums tracking-widest text-blue-400">
                DOT {carrier.dotNumber}
              </span>
              {carrier.statusCode && (
                <MetaBadge variant={carrier.statusCode === "A" ? "active" : "default"}>
                  {carrier.statusCode === "A" ? "Active" : carrier.statusCode === "I" ? "Inactive" : carrier.statusCode}
                </MetaBadge>
              )}
              {carrier.priorRevokeFlag === "Y" && (
                <MetaBadge variant="danger">Prior Revoke</MetaBadge>
              )}
            </div>

            {/* Name */}
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
              {carrier.legalName}
            </h2>
            {carrier.dbaName && (
              <p className="text-sm text-slate-500">DBA: {carrier.dbaName}</p>
            )}

            {/* Address & phone */}
            <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
              {[carrier.phyStreet, carrier.phyCity, carrier.phyState, carrier.phyZip]
                .filter(Boolean)
                .join(", ")}
            </p>
            {carrier.phone && (
              <p className="mt-0.5 text-[13px] text-slate-500 tabular-nums">
                {carrier.phone}
              </p>
            )}

            {/* Metadata badges */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {carrier.powerUnits != null && (
                <MetaBadge>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="mr-1">
                    <rect x="1" y="3" width="9" height="5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 3V2M8 3V2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  {carrier.powerUnits} units
                </MetaBadge>
              )}
              {carrier.totalDrivers != null && (
                <MetaBadge>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="mr-1">
                    <circle cx="5.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M1.5 10a4 4 0 018 0" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  {carrier.totalDrivers} drivers
                </MetaBadge>
              )}
            </div>
          </div>

          {/* Risk gauges */}
          {riskScore && (
            <div className="flex gap-3">
              <RiskGauge score={riskScore.compositeScore} label="Composite" />
              <RiskGauge score={riskScore.chameleonScore} label="Chameleon" />
              <RiskGauge score={riskScore.safetyScore} label="Safety" />
            </div>
          )}
        </div>

        {/* Risk signals */}
        {riskScore && riskScore.signals.length > 0 && (
          <div className="mt-4 border-t border-slate-800/50 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
              Risk Signals
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {riskScore.signals.map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-rose-500/8 px-2 py-0.5 text-[11px] font-medium text-rose-400 ring-1 ring-rose-500/15"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Officers ────────────────────────────────────────────── */}
      {(carrier.companyOfficer1 || carrier.companyOfficer2) && (
        <div className="card-elevated rounded-2xl p-5">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M2.5 13a4.5 4.5 0 019 0" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            }
            title="Company Officers"
          />
          <div className="mt-3 space-y-1">
            {[carrier.companyOfficer1, carrier.companyOfficer2]
              .filter(Boolean)
              .map((officer) => (
                <div key={officer} className="flex items-center gap-2 rounded-lg bg-slate-800/30 px-3 py-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/50 text-[10px] font-semibold text-slate-400">
                    {officer!.charAt(0)}
                  </div>
                  <p className="text-sm text-slate-300">{officer}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Detection Signals Loading ───────────────────────────── */}
      {signalsLoading && (
        <div className="card-elevated rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
            <span className="text-sm text-slate-500">Analyzing detection signals...</span>
          </div>
        </div>
      )}

      {/* ── Anomaly Flags ───────────────────────────────────────── */}
      {signals && signals.anomalyFlags.length > 0 && (
        <div className="card-elevated rounded-2xl p-5">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L12.5 11.5H1.5L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M7 5.5v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="9.75" r="0.5" fill="currentColor" />
              </svg>
            }
            title="Anomaly Flags"
            count={signals.anomalyFlags.length}
            color="text-amber-400"
          />
          <div className="mt-3 space-y-2">
            {signals.anomalyFlags.map((flag) => {
              const s = SEVERITY[flag.severity] ?? SEVERITY.low;
              return (
                <div
                  key={flag.id}
                  className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 ${s.bg} ${s.border}`}
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
      )}

      {/* ── Authority Mill ──────────────────────────────────────── */}
      {signals?.authorityMill.isMillPattern && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 glow-warning">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v5l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            }
            title="Authority Mill Pattern"
            color="text-orange-400"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Rapid authority grant/revoke cycles detected — potential mill operation.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { value: signals.authorityMill.grantCount, label: "Grants" },
              { value: signals.authorityMill.revokeCount, label: "Revocations" },
              { value: signals.authorityMill.avgDaysBetween, label: "Avg Days" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-orange-500/8 py-2.5 text-center">
                <p className="text-xl font-bold tabular-nums text-orange-300">{item.value}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Broker Reincarnation ────────────────────────────────── */}
      {signals?.brokerReincarnation.isReincarnation && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 glow-critical">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5v4M9.5 3.5l-2.5 2-2.5-2M4 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Broker Reincarnation Detected"
            color="text-rose-400"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Matches prior DOT on multiple fields — possible re-registration under new identity.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {signals.brokerReincarnation.priorDot && (
              <button
                onClick={() => onSelectDot(signals.brokerReincarnation.priorDot!)}
                className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 ring-1 ring-rose-500/20 transition hover:bg-rose-500/25"
              >
                Prior DOT: {signals.brokerReincarnation.priorDot}
              </button>
            )}
            {[
              { match: signals.brokerReincarnation.addressMatch, label: "Address" },
              { match: signals.brokerReincarnation.phoneMatch, label: "Phone" },
              { match: signals.brokerReincarnation.officerMatch, label: "Officers" },
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
      )}

      {/* ── Shared Insurance ────────────────────────────────────── */}
      {signals && signals.sharedInsurance.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 glow-warning">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1.5 6h11" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            }
            title="Shared Insurance"
            count={signals.sharedInsurance.length}
            color="text-amber-400"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Other carriers share the same insurance policies — potential chameleon signal.
          </p>
          <div className="mt-3 space-y-2">
            {signals.sharedInsurance.map((si) => (
              <div
                key={si.policyNumber}
                className="rounded-xl border border-slate-700/40 bg-slate-800/20 px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400">{si.policyNumber}</span>
                  <span className="text-[11px] text-slate-500">{si.insurerName}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {si.matchingDots.map((dot) => (
                    <button
                      key={dot}
                      onClick={() => onSelectDot(dot)}
                      className="rounded-md bg-slate-800/60 px-2 py-0.5 text-[11px] font-medium tabular-nums text-blue-400 ring-1 ring-slate-700/40 transition hover:bg-slate-700/60"
                    >
                      DOT {dot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Linked Carriers ─────────────────────────────────────── */}
      {links.length > 0 && (
        <div className="card-elevated rounded-2xl p-5">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 4L8.5 7L5.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="3.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="10.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            }
            title="Linked Carriers"
            count={links.length}
          />
          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {links.map((link) => (
              <button
                key={link.otherDotNumber}
                onClick={() => onSelectDot(link.otherDotNumber)}
                className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all hover:bg-slate-800/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                    {link.otherLegalName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-[11px] tabular-nums text-slate-500">
                      DOT {link.otherDotNumber}
                    </span>
                    {link.reasons.slice(0, 3).map((r, i) => (
                      <span
                        key={i}
                        className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[9px] font-medium text-slate-500"
                      >
                        {r.feature}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-blue-400 ring-1 ring-blue-500/15">
                  {link.score.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Crashes ─────────────────────────────────────────────── */}
      {crashes.length > 0 && (
        <div className="card-elevated rounded-2xl p-5">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L12 5v4l-5 3.5L2 9V5l5-3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M7 5.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.5" fill="currentColor" />
              </svg>
            }
            title="Crash History"
            count={crashes.length}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {["Date", "State", "Fatal", "Injuries", "Tow"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crashes.slice(0, 20).map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-800/30 transition-colors hover:bg-slate-800/20"
                  >
                    <td className="py-2 pr-4 text-xs tabular-nums text-slate-300">
                      {c.reportDate
                        ? new Date(c.reportDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-400">{c.state || "—"}</td>
                    <td className="py-2 pr-4 text-xs tabular-nums">
                      {c.fatalities > 0 ? (
                        <span className="font-semibold text-rose-400">{c.fatalities}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs tabular-nums text-slate-400">{c.injuries}</td>
                    <td className="py-2 text-xs text-slate-400">{c.towAway ? "Y" : "N"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Cluster Members ─────────────────────────────────────── */}
      {clusterMembers.length > 1 && (
        <div className="card-elevated rounded-2xl p-5">
          <SectionHeader
            icon={
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
                <circle cx="3" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
                <circle cx="11" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
                <circle cx="7" cy="12" r="1.5" stroke="currentColor" strokeWidth="1" />
              </svg>
            }
            title="Cluster Members"
            count={clusterMembers.length}
            color="text-purple-400"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {clusterMembers.map((m) => {
              const isCurrent = m.dotNumber === dotNumber;
              return (
                <button
                  key={m.dotNumber}
                  onClick={() => onSelectDot(m.dotNumber)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-blue-500/12 text-blue-300 ring-1 ring-blue-500/25"
                      : "bg-slate-800/40 text-slate-400 ring-1 ring-slate-700/40 hover:bg-slate-800/60 hover:text-slate-300"
                  }`}
                >
                  {m.legalName}
                  <span className="ml-1.5 tabular-nums text-slate-600">
                    {m.dotNumber}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
