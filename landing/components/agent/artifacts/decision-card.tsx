"use client";

/**
 * DecisionCard — the headline verdict artifact.
 *
 * Renders verdict (pass/watch/fail) with strong visual cue, headline,
 * up to 8 bullet points, a confidence bar, and citation chips.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type DecisionPayload = {
  verdict: "pass" | "watch" | "fail";
  headline: string;
  bullets: string[];
  confidence: number;
  citations: string[];
};

const VERDICT_STYLES: Record<DecisionPayload["verdict"], { label: string; bg: string; fg: string; border: string }> = {
  pass: { label: "PASS", bg: "rgba(22, 163, 74, 0.10)", fg: "#15803d", border: "#16a34a" },
  watch: { label: "WATCH", bg: "rgba(217, 119, 87, 0.10)", fg: "#9a3412", border: "#d97757" },
  fail: { label: "FAIL", bg: "rgba(220, 38, 38, 0.10)", fg: "#991b1b", border: "#dc2626" },
};

export function DecisionCard({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as DecisionPayload;
  if (!payload || typeof payload !== "object") return null;
  const style = VERDICT_STYLES[payload.verdict] || VERDICT_STYLES.watch;
  const confidencePct = Math.round((payload.confidence ?? 0) * 100);

  return (
    <div
      className="rounded-xl border-2 p-5"
      style={{ borderColor: style.border, background: "var(--surface-1)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          className="rounded-md px-3 py-1 text-xs font-bold tracking-widest"
          style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
        >
          {style.label}
        </div>
        {artifact.title && (
          <span className="text-xs font-semibold" style={{ color: "var(--ink-muted)" }}>
            {artifact.title}
          </span>
        )}
      </div>

      <h3
        className="mb-3 text-base font-semibold leading-snug"
        style={{ color: "var(--ink)" }}
      >
        {payload.headline}
      </h3>

      <ul className="mb-4 space-y-1.5 text-sm" style={{ color: "var(--ink-soft)" }}>
        {payload.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 flex-shrink-0" style={{ color: style.border }}>
              •
            </span>
            <span className="leading-snug">{b}</span>
          </li>
        ))}
      </ul>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-muted)" }}>
          <span>Confidence</span>
          <span>{confidencePct}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--surface-2)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${confidencePct}%`, background: style.border }}
          />
        </div>
      </div>

      {payload.citations && payload.citations.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {payload.citations.map((id) => (
            <code
              key={id}
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
              title="Tool call citation"
            >
              {id.slice(0, 12)}…
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
