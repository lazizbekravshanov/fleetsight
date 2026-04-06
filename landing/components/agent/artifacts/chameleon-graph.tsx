"use client";

/**
 * ChameleonGraph — minimal force-positioned network of related carriers.
 *
 * Pure SVG, no D3 dep. Nodes are placed in a deterministic radial layout
 * with the rootDot at the center. Edges are straight lines weighted by
 * the `weight` field. Sufficient for Phase 7; Phase 14 will reuse the
 * existing affiliation graph component if more interactivity is needed.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type Node = {
  dot: string;
  legalName?: string;
  cluster?: string;
  risk?: "low" | "medium" | "high" | "critical";
};

type Edge = {
  from: string;
  to: string;
  weight?: number;
  reason?: string;
};

type GraphPayload = {
  rootDot: string;
  nodes: Node[];
  edges: Edge[];
  citations: string[];
};

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a",
  medium: "#eab308",
  high: "#ea580c",
  critical: "#dc2626",
};

const WIDTH = 380;
const HEIGHT = 260;

export function ChameleonGraph({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as GraphPayload;
  if (!payload || typeof payload !== "object") return null;

  const positions = layout(payload.rootDot, payload.nodes);
  const nodeMap = new Map(payload.nodes.map((n) => [n.dot, n]));

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
          affiliation graph
        </span>
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {payload.nodes.length} carriers · {payload.edges.length} links
        </span>
      </div>

      <div className="overflow-hidden rounded-lg" style={{ background: "var(--surface-2)" }}>
        <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img">
          {payload.edges.map((e, i) => {
            const a = positions.get(e.from);
            const b = positions.get(e.to);
            if (!a || !b) return null;
            const opacity = Math.max(0.2, Math.min(1, e.weight ?? 0.5));
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#94a3b8"
                strokeWidth={1 + (e.weight ?? 0.3) * 2}
                opacity={opacity}
              />
            );
          })}
          {payload.nodes.map((n) => {
            const p = positions.get(n.dot);
            if (!p) return null;
            const isRoot = n.dot === payload.rootDot;
            const fill = isRoot ? "var(--accent)" : RISK_COLORS[n.risk ?? "low"] || "#94a3b8";
            return (
              <g key={n.dot}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isRoot ? 12 : 7}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={p.y + (isRoot ? 26 : 20)}
                  textAnchor="middle"
                  fontSize={isRoot ? 11 : 9}
                  fill="var(--ink)"
                  fontWeight={isRoot ? 600 : 400}
                >
                  {n.legalName ? truncate(n.legalName, 18) : `DOT ${n.dot}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        {payload.edges.slice(0, 6).map((e, i) => {
          const fromName = nodeMap.get(e.from)?.legalName || `DOT ${e.from}`;
          const toName = nodeMap.get(e.to)?.legalName || `DOT ${e.to}`;
          return (
            <li key={i}>
              <span className="font-medium">{fromName}</span> ↔ <span className="font-medium">{toName}</span>
              {e.reason && <span className="ml-1" style={{ color: "var(--ink-muted)" }}>— {e.reason}</span>}
            </li>
          );
        })}
      </ul>

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

function layout(rootDot: string, nodes: Node[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2 - 10;
  positions.set(rootDot, { x: cx, y: cy });

  const others = nodes.filter((n) => n.dot !== rootDot);
  const radius = Math.min(WIDTH, HEIGHT) * 0.35;
  others.forEach((node, i) => {
    const angle = (i / Math.max(others.length, 1)) * 2 * Math.PI - Math.PI / 2;
    positions.set(node.dot, {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  });
  return positions;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
