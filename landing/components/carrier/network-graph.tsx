"use client";

import { useState, useEffect, useRef } from "react";

type NetworkNode = {
  id: number;
  label: string;
  status: string | null;
  isCurrent: boolean;
};

type NetworkEdge = {
  source: number;
  target: number;
  type: "vin" | "address" | "principal" | "phone";
  label: string;
};

type NetworkData = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
};

const EDGE_COLORS: Record<string, string> = {
  vin: "#3b82f6",
  address: "#f59e0b",
  principal: "#8b5cf6",
  phone: "#6b7280",
};

const EDGE_LABELS: Record<string, string> = {
  vin: "Shared VINs",
  address: "Shared Address",
  principal: "Shared Principal",
  phone: "Shared Phone",
};

export function NetworkGraph({ dotNumber }: { dotNumber: string }) {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!expanded) return;
    setLoading(true);
    fetch(`/api/carrier/${dotNumber}/network`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Failed to load")))
      .then((raw) => {
        const nodes: NetworkNode[] = [];
        const edges: NetworkEdge[] = [];
        const seen = new Set<number>();
        const dot = parseInt(dotNumber, 10);

        nodes.push({ id: dot, label: "This carrier", status: "A", isCurrent: true });
        seen.add(dot);

        const addNode = (d: number, name: string | null, status: string | null) => {
          if (seen.has(d)) return;
          seen.add(d);
          nodes.push({ id: d, label: name ?? `DOT ${d}`, status, isCurrent: false });
        };

        for (const c of raw.vinAffiliations?.carriers ?? []) {
          addNode(c.dotNumber, c.legalName, null);
          edges.push({ source: dot, target: c.dotNumber, type: "vin", label: `${c.sharedVinCount} shared VINs` });
        }
        for (const c of raw.addressAffiliations?.carriers ?? []) {
          const d = typeof c.dotNumber === "string" ? parseInt(c.dotNumber, 10) : c.dotNumber;
          addNode(d, c.legalName, c.statusCode);
          edges.push({ source: dot, target: d, type: "address", label: "Same address" });
        }
        for (const cl of raw.principalAffiliations?.clusters ?? []) {
          for (const c of cl.carriers ?? []) {
            const d = typeof c.dotNumber === "string" ? parseInt(c.dotNumber, 10) : c.dotNumber;
            if (d === dot) continue;
            addNode(d, c.legalName, c.statusCode);
            edges.push({ source: dot, target: d, type: "principal", label: `Shared: ${cl.name}` });
          }
        }
        for (const c of raw.phoneAffiliations?.carriers ?? []) {
          addNode(c.dotNumber, c.legalName, c.statusCode);
          edges.push({ source: dot, target: c.dotNumber, type: "phone", label: "Same phone" });
        }

        setData(nodes.length <= 1 ? null : { nodes, edges });
      })
      .catch(() => setError("Failed to load network data"))
      .finally(() => setLoading(false));
  }, [expanded, dotNumber]);

  // Simple SVG layout (no D3 simulation to avoid bundle weight — static radial layout)
  useEffect(() => {
    if (!data || !svgRef.current) return;
    // Positions are computed inline in the SVG render below
  }, [data]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full rounded-xl border border-dashed px-5 py-4 text-sm font-medium transition-colors hover:border-[var(--accent)]"
        style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--surface-1)" }}
      >
        Load Entity Relationship Graph
      </button>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border px-5 py-12 text-center text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--ink-muted)" }}>
        Loading network connections...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border px-5 py-8 text-center text-sm"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)", color: "var(--ink-muted)" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border px-5 py-8 text-center text-sm"
        style={{ borderColor: "#16a34a", background: "rgba(22,163,74,0.06)", color: "#15803d" }}>
        No network connections detected. This carrier appears to operate independently.
      </div>
    );
  }

  // Radial layout: center node + connected nodes in a circle
  const W = 800, H = 400;
  const cx = W / 2, cy = H / 2;
  const others = data.nodes.filter((n) => !n.isCurrent);
  const angleStep = (2 * Math.PI) / Math.max(others.length, 1);
  const radius = Math.min(W, H) / 2 - 60;

  const positions = new Map<number, { x: number; y: number }>();
  const center = data.nodes.find((n) => n.isCurrent)!;
  positions.set(center.id, { x: cx, y: cy });
  others.forEach((n, i) => {
    const angle = angleStep * i - Math.PI / 2;
    positions.set(n.id, { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  return (
    <div className="space-y-3">
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 400 }}>
          {/* Edges */}
          {data.edges.map((e, i) => {
            const s = positions.get(e.source);
            const t = positions.get(e.target);
            if (!s || !t) return null;
            return (
              <line key={`e${i}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={EDGE_COLORS[e.type] ?? "#6b7280"} strokeWidth={2} strokeOpacity={0.5} />
            );
          })}
          {/* Nodes */}
          {data.nodes.map((n) => {
            const pos = positions.get(n.id);
            if (!pos) return null;
            const fill = n.isCurrent ? "var(--accent)" : n.status === "A" ? "#16a34a" : n.status === "OOS" ? "#dc2626" : "#6b7280";
            const r = n.isCurrent ? 24 : 16;
            return (
              <g key={n.id}>
                <circle cx={pos.x} cy={pos.y} r={r} fill={fill} opacity={0.9} />
                {n.isCurrent ? (
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>YOU</text>
                ) : (
                  <a href={`/carrier/${n.id}`}>
                    <text x={pos.x} y={pos.y + r + 14} textAnchor="middle" fill="var(--ink-soft)" fontSize={10} fontWeight={500}>
                      {n.label.length > 25 ? n.label.slice(0, 22) + "..." : n.label}
                    </text>
                    <text x={pos.x} y={pos.y + r + 26} textAnchor="middle" fill="var(--ink-muted)" fontSize={9}>
                      DOT {n.id}
                    </text>
                  </a>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px]" style={{ color: "var(--ink-muted)" }}>
        {Object.entries(EDGE_LABELS).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded" style={{ background: EDGE_COLORS[type] }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#16a34a" }} /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#dc2626" }} /> OOS/Revoked
        </span>
      </div>
    </div>
  );
}
