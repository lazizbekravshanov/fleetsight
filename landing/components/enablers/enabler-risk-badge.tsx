"use client";

/* ── Types ───────────────────────────────────────────────────── */

export type EnablerRiskInfo = {
  id: string;
  name: string;
  type: string;
  relationship: string;
  riskScore: number;
  riskTier: string | null;
  isCurrent: boolean;
};

/* ── Tier Colors ──────────────────────────────────────────────── */

const TIER_STYLES: Record<string, { badge: string; text: string }> = {
  CRITICAL: {
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
    text: "text-rose-700",
  },
  HIGH: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    text: "text-amber-700",
  },
  MODERATE: {
    badge: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
    text: "text-yellow-700",
  },
  LOW: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    text: "text-emerald-700",
  },
};

const DEFAULT_STYLE = {
  badge: "bg-surface-2 text-ink-soft ring-1 ring-border/20",
  text: "text-ink-soft",
};

function tierStyle(tier: string | null) {
  if (!tier) return DEFAULT_STYLE;
  return TIER_STYLES[tier.toUpperCase()] ?? DEFAULT_STYLE;
}

/* ── Type abbreviation ────────────────────────────────────────── */

const TYPE_ABBREV: Record<string, string> = {
  AGENT: "AGT",
  BROKER: "BRK",
  FREIGHT_FORWARDER: "FF",
  SHIPPER: "SHP",
  DISPATCHER: "DSP",
  FACTORING: "FAC",
  INSURANCE: "INS",
};

function abbreviateType(type: string): string {
  return TYPE_ABBREV[type.toUpperCase()] ?? type.slice(0, 3).toUpperCase();
}

/* ── EnablerRiskBadge ─────────────────────────────────────────── */

export function EnablerRiskBadge({ enabler }: { enabler: EnablerRiskInfo }) {
  const style = tierStyle(enabler.riskTier);
  const dimmed = !enabler.isCurrent;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
        style.badge
      } ${dimmed ? "opacity-50" : ""}`}
      title={`${enabler.name} (${enabler.type}) - ${enabler.relationship} - Score: ${enabler.riskScore}/100${dimmed ? " (inactive)" : ""}`}
    >
      <span className="max-w-[10rem] truncate font-semibold">
        {enabler.name}
      </span>
      <span className="text-[10px] opacity-70">
        {abbreviateType(enabler.type)}
      </span>
      {enabler.riskTier && (
        <span
          className={`rounded px-1 py-px text-[10px] font-bold uppercase ${style.text}`}
        >
          {enabler.riskTier}
        </span>
      )}
      <span className="text-[10px] opacity-60">
        Score: {enabler.riskScore}/100
      </span>
      {dimmed && (
        <span className="text-[10px] italic opacity-60">inactive</span>
      )}
    </span>
  );
}

/* ── EnablerWarningPanel ──────────────────────────────────────── */

export function EnablerWarningPanel({
  enablers,
  warnings,
}: {
  enablers: EnablerRiskInfo[];
  warnings: string[];
}) {
  const highRiskEnablers = enablers.filter(
    (e) =>
      e.riskTier &&
      (e.riskTier.toUpperCase() === "CRITICAL" ||
        e.riskTier.toUpperCase() === "HIGH")
  );

  if (highRiskEnablers.length === 0) return null;

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        {/* Warning icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-rose-600"
        >
          <path
            d="M8 1.5L1 14h14L8 1.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 6v3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
        </svg>
        <h3 className="text-sm font-semibold text-rose-800">
          ENABLER WARNING
        </h3>
        <span className="ml-auto text-xs text-rose-600">
          {highRiskEnablers.length} high-risk enabler{highRiskEnablers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Enabler badges */}
      <div className="mb-3 flex flex-wrap gap-2">
        {highRiskEnablers.map((e) => (
          <EnablerRiskBadge key={e.id} enabler={e} />
        ))}
      </div>

      {/* Warning messages */}
      {warnings.length > 0 && (
        <ul className="space-y-1">
          {warnings.map((msg, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-rose-700">
              <span className="mt-0.5 shrink-0 text-rose-400">&bull;</span>
              {msg}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
