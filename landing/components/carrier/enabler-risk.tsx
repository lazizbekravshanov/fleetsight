"use client";

import { useState, useEffect } from "react";

type EnablerInfo = {
  id: string;
  name: string;
  type: string;
  relationship: string;
  riskScore: number;
  riskTier: string | null;
  isCurrent: boolean;
};

type EnablerData = {
  enablers: EnablerInfo[];
  warnings: string[];
};

const TIER_COLORS: Record<string, { bg: string; fg: string }> = {
  CRITICAL: { bg: "rgba(220,38,38,0.12)", fg: "#991b1b" },
  HIGH: { bg: "rgba(217,119,87,0.14)", fg: "#9a3412" },
  MODERATE: { bg: "rgba(202,138,4,0.12)", fg: "#854d0e" },
  LOW: { bg: "rgba(22,163,74,0.10)", fg: "#15803d" },
};

export function EnablerRisk({ dotNumber }: { dotNumber: string }) {
  const [data, setData] = useState<EnablerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/carriers/${dotNumber}/enablers`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [dotNumber]);

  if (loading) {
    return (
      <div className="rounded-xl border px-5 py-8 text-center text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--ink-muted)" }}>
        Loading enabler data...
      </div>
    );
  }

  if (loaded && (!data || data.enablers.length === 0)) {
    return (
      <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm"
        style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}>
        Enabler data not yet analyzed for this carrier.
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-2">
      {data.warnings.map((w, i) => (
        <div key={i} className="rounded-lg border px-4 py-2 text-xs"
          style={{ borderColor: "var(--border)", background: "rgba(220,38,38,0.06)", color: "#991b1b" }}>
          {w}
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.enablers.map((e) => {
          const tier = e.riskTier?.toUpperCase() ?? "LOW";
          const tc = TIER_COLORS[tier] ?? TIER_COLORS.LOW;
          const barColor = e.riskScore >= 70 ? "#dc2626" : e.riskScore >= 40 ? "#d97706" : "#16a34a";
          return (
            <div key={e.id} className="rounded-xl border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>{e.name}</span>
                <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ml-2"
                  style={{ background: tc.bg, color: tc.fg }}>
                  {tier}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--ink-muted)" }}>
                {e.type} · {e.relationship}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(e.riskScore, 100)}%`, background: barColor }} />
                </div>
                <span className="text-xs font-semibold tabular-nums w-8 text-right" style={{ color: barColor }}>
                  {e.riskScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
