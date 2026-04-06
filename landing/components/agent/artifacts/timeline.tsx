"use client";

/**
 * Timeline — chronological event ribbon (authority changes, inspections, crashes…).
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type Severity = "info" | "low" | "medium" | "high" | "critical";

type Event = {
  date: string;
  title: string;
  detail?: string;
  severity?: Severity;
};

type TimelinePayload = {
  events: Event[];
  citations: string[];
};

const SEVERITY_COLORS: Record<Severity, string> = {
  info: "#94a3b8",
  low: "#16a34a",
  medium: "#eab308",
  high: "#ea580c",
  critical: "#dc2626",
};

export function Timeline({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as TimelinePayload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.events)) return null;

  const sorted = [...payload.events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}
        >
          timeline
        </span>
        {artifact.title && (
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {artifact.title}
          </h3>
        )}
      </div>

      <ol className="space-y-3">
        {sorted.map((event, i) => {
          const color = SEVERITY_COLORS[event.severity ?? "info"];
          return (
            <li key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className="mt-1 inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: color }}
                />
                {i < sorted.length - 1 && (
                  <span className="mt-1 h-full w-px flex-1" style={{ background: "var(--border)" }} />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-baseline gap-2">
                  <time className="font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {formatDate(event.date)}
                  </time>
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {event.title}
                  </span>
                </div>
                {event.detail && (
                  <p className="mt-0.5 text-xs leading-snug" style={{ color: "var(--ink-soft)" }}>
                    {event.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {payload.citations && payload.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          {payload.citations.map((id) => (
            <code
              key={id}
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
            >
              {id.slice(0, 12)}…
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
