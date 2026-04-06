"use client";

/**
 * Comparison — side-by-side comparison of two carriers across labeled rows.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type Row = {
  label: string;
  a: string | number | null;
  b: string | number | null;
  winner?: "a" | "b" | "tie";
};

type ComparisonPayload = {
  rows: Row[];
  carrierA: { dot: string; label: string };
  carrierB: { dot: string; label: string };
  citations: string[];
};

export function Comparison({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as ComparisonPayload;
  if (!payload || typeof payload !== "object") return null;

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
          comparison
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="px-2 py-1.5 text-left" style={{ color: "var(--ink-muted)" }}></th>
            <th className="px-2 py-1.5 text-left font-semibold" style={{ color: "var(--ink)" }}>
              {payload.carrierA.label}
              <div className="font-mono text-[10px] font-normal" style={{ color: "var(--ink-muted)" }}>
                DOT {payload.carrierA.dot}
              </div>
            </th>
            <th className="px-2 py-1.5 text-left font-semibold" style={{ color: "var(--ink)" }}>
              {payload.carrierB.label}
              <div className="font-mono text-[10px] font-normal" style={{ color: "var(--ink-muted)" }}>
                DOT {payload.carrierB.dot}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {payload.rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--surface-2)" }}>
              <td className="px-2 py-1.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>
                {row.label}
              </td>
              <Cell value={row.a} winner={row.winner === "a"} />
              <Cell value={row.b} winner={row.winner === "b"} />
            </tr>
          ))}
        </tbody>
      </table>

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

function Cell({ value, winner }: { value: string | number | null; winner: boolean }) {
  return (
    <td
      className="px-2 py-1.5"
      style={{
        color: "var(--ink)",
        fontWeight: winner ? 600 : 400,
        background: winner ? "rgba(22, 163, 74, 0.06)" : undefined,
      }}
    >
      {value === null || value === undefined ? "—" : String(value)}
    </td>
  );
}
