"use client";

import { useState, useEffect } from "react";
import type { TrustResult } from "@/lib/intelligence/trust-score";
import type { RiskSignal } from "@/lib/intelligence/risk-signals";

const GRADE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  B: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200" },
  C: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  D: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
  F: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  HIGH: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  MEDIUM: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  LOW: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  INFO: { bg: "bg-[var(--surface-2)]", text: "text-[var(--ink-soft)]", dot: "bg-[var(--ink-muted)]" },
};

const COMPONENT_COLORS = ["#d97757", "#3b82f6", "#a855f7", "#10b981"];

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.C;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        {/* Score arc */}
        <circle
          cx="50" cy="50" r="42" fill="none"
          stroke={score >= 80 ? "#10b981" : score >= 65 ? "#22c55e" : score >= 50 ? "#eab308" : score >= 35 ? "#f97316" : "#ef4444"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--ink)]">{score}</span>
        <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${colors.bg} ${colors.text} ${colors.ring}`}>
          {grade}
        </span>
      </div>
    </div>
  );
}

export function TrustScorePanel({ dotNumber }: { dotNumber: string }) {
  const [data, setData] = useState<{ trustScore: TrustResult; riskSignals: RiskSignal[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllSignals, setShowAllSignals] = useState(false);

  useEffect(() => {
    fetch(`/api/carrier/${dotNumber}/intelligence`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dotNumber]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
        <div className="flex items-center gap-6">
          <div className="h-[120px] w-[120px] rounded-full bg-surface-3 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-32 rounded bg-surface-3 animate-pulse" />
            <div className="h-3 w-full rounded bg-surface-3 animate-pulse" />
            <div className="h-3 w-full rounded bg-surface-3 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-surface-3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { trustScore, riskSignals } = data;
  const criticalCount = riskSignals.filter((s) => s.severity === "CRITICAL").length;
  const highCount = riskSignals.filter((s) => s.severity === "HIGH").length;
  const visibleSignals = showAllSignals ? riskSignals : riskSignals.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Trust Score Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Carrier Trust Score</h3>
          {(criticalCount > 0 || highCount > 0) && (
            <div className="flex items-center gap-2">
              {criticalCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                  {criticalCount} CRITICAL
                </span>
              )}
              {highCount > 0 && (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 ring-1 ring-orange-200">
                  {highCount} HIGH
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-start gap-6">
          <ScoreGauge score={trustScore.overall} grade={trustScore.grade} />

          {/* Component bars */}
          <div className="flex-1 space-y-3">
            {trustScore.components.map((comp, i) => (
              <div key={comp.name}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--ink-soft)]">{comp.name}</span>
                  <span className="font-medium text-[var(--ink)]">{comp.score}/100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${comp.score}%`,
                      backgroundColor: COMPONENT_COLORS[i] ?? "var(--accent)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Component details (expandable) */}
        <details className="mt-4 group">
          <summary className="text-[10px] text-accent cursor-pointer hover:text-accent-hover">
            View scoring details
          </summary>
          <div className="mt-3 space-y-3">
            {trustScore.components.map((comp) => (
              <div key={comp.name} className="rounded-lg bg-[var(--surface-2)] px-3 py-2">
                <p className="text-xs font-medium text-[var(--ink)] mb-1">
                  {comp.name} <span className="text-[var(--ink-muted)]">({comp.weight}% weight)</span>
                </p>
                <ul className="space-y-0.5">
                  {comp.details.map((d, i) => (
                    <li key={i} className="text-[11px] text-[var(--ink-soft)]">{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Risk Signals */}
      {riskSignals.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Risk Signals <span className="text-[var(--ink-muted)] font-normal">({riskSignals.length})</span>
            </h3>
            <div className="flex items-center gap-1.5">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
                const count = riskSignals.filter((s) => s.severity === sev).length;
                if (count === 0) return null;
                const style = SEVERITY_STYLES[sev];
                return (
                  <span key={sev} className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${style.bg} ${style.text}`}>
                    {count}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            {visibleSignals.map((signal, i) => {
              const style = SEVERITY_STYLES[signal.severity] ?? SEVERITY_STYLES.INFO;
              return (
                <div key={i} className={`rounded-lg ${style.bg} px-3 py-2.5`}>
                  <div className="flex items-start gap-2">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${style.text}`}>{signal.title}</span>
                        <span className="rounded bg-white/60 px-1 py-0.5 text-[8px] font-medium text-[var(--ink-muted)] uppercase">
                          {signal.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-soft)] leading-relaxed">
                        {signal.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {riskSignals.length > 5 && (
            <button
              onClick={() => setShowAllSignals(!showAllSignals)}
              className="mt-2 text-[10px] text-accent hover:text-accent-hover"
            >
              {showAllSignals ? "Show less" : `Show all ${riskSignals.length} signals`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
