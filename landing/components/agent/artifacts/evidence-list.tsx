"use client";

/**
 * EvidenceList — compact tabular evidence (inspections, crashes, violations…).
 *
 * Renders a normalized table from a heterogeneous items array. Auto-detects
 * column keys from the first 5 items and shows up to 8 columns.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type EvidencePayload = {
  kind: "inspections" | "crashes" | "violations" | "insurance" | "authority" | "affiliations" | "other";
  caption?: string;
  items: Array<Record<string, unknown>>;
  citations: string[];
};

const KIND_LABELS: Record<EvidencePayload["kind"], string> = {
  inspections: "Inspections",
  crashes: "Crashes",
  violations: "Violations",
  insurance: "Insurance",
  authority: "Authority history",
  affiliations: "Affiliated carriers",
  other: "Evidence",
};

export function EvidenceList({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as EvidencePayload;
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) return null;

  const items = payload.items;
  const columns = inferColumns(items).slice(0, 8);
  const label = KIND_LABELS[payload.kind] || "Evidence";

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
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {items.length} record{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {payload.caption && (
        <p className="mb-3 text-xs" style={{ color: "var(--ink-soft)" }}>
          {payload.caption}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
          No records.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-2 py-1.5 text-left font-semibold"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {humanizeKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 50).map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                  {columns.map((col) => (
                    <td key={col} className="px-2 py-1.5" style={{ color: "var(--ink)" }}>
                      {formatCell(item[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function inferColumns(items: Array<Record<string, unknown>>): string[] {
  if (items.length === 0) return [];
  const seen = new Set<string>();
  for (const item of items.slice(0, 5)) {
    for (const key of Object.keys(item)) seen.add(key);
  }
  return Array.from(seen);
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.length > 60 ? value.slice(0, 60) + "…" : value;
  if (Array.isArray(value)) return `[${value.length}]`;
  if (typeof value === "object") return "{…}";
  return String(value);
}
