"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import type { BasicScore } from "./types";

export const BADGE_COLORS = {
  blue: "bg-blue-500/20 text-blue-300",
  purple: "bg-purple-500/20 text-purple-300",
  amber: "bg-amber-500/20 text-amber-300",
  slate: "bg-slate-500/20 text-slate-300",
} as const;

export const BORDER_COLORS = {
  blue: "border-l-blue-500",
  purple: "border-l-purple-500",
  amber: "border-l-amber-500",
  slate: "border-l-slate-500",
} as const;

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <div className="h-3 w-2/5 rounded-full bg-slate-800" />
          <div className="h-3 w-1/5 rounded-full bg-slate-800" />
          <div className="ml-auto h-3 w-1/6 rounded-full bg-slate-800" />
        </motion.div>
      ))}
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right text-slate-100">{value}</dd>
    </div>
  );
}

export function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
      <div className={`h-0.5 ${warn ? "bg-rose-500" : "bg-blue-500"}`} />
      <div className="px-4 py-2">
        <p className="text-xs text-slate-400">{label}</p>
        <p
          className={`text-xl font-semibold ${
            warn ? "text-rose-400" : "text-slate-100"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/** Extract array from FMCSA nested response shape */
export function extractArray(payload: unknown, key: string): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (obj.content && typeof obj.content === "object") {
    const content = obj.content as Record<string, unknown>;
    const val = content[key];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
    if (val && typeof val === "object") return [val as Record<string, unknown>];
  }
  const val = obj[key];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  if (val && typeof val === "object") return [val as Record<string, unknown>];
  return [];
}

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  return s === "" ? null : s;
}

/** Parse FMCSA basics response into typed BasicScore[] */
export function parseBasics(basicsPayload: unknown): BasicScore[] {
  const raw = extractArray(basicsPayload, "basics");
  if (raw.length === 0) return [];

  return raw.map((b) => ({
    name: str(b.basicsDescription) || str(b.basicsDesc) || str(b.basicDesc) || "Unknown",
    percentile: Number(b.basicsPercentile ?? b.percentile ?? 0),
    totalViolations: Number(b.totalViolations ?? b.violTot ?? 0),
    totalInspections: Number(b.totalInspections ?? b.inspTot ?? 0),
    serious: Number(b.seriousViolations ?? b.seriousViol ?? 0),
    measureValue: Number(b.basicsValue ?? b.measureValue ?? 0),
    rdDeficient: str(b.rdDeficient) === "Y" || str(b.basicsExceedFlag) === "Y",
    code: str(b.basicsId) || str(b.basicsCode) || str(b.basicCode) || "",
  })).sort((a, b) => b.percentile - a.percentile);
}

/* ── useSort Hook ─────────────────────────────────────────────── */

export type SortDir = "asc" | "desc";

export function useSort<T>(items: T[], defaultKey?: keyof T & string, defaultDir: SortDir = "asc") {
  const [sortKey, setSortKey] = useState<string | null>(defaultKey ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const toggle = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      let cmp = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  return { sorted, sortKey, sortDir, toggle };
}

/* ── SortHeader Component ─────────────────────────────────────── */

export function SortHeader({
  label,
  sortKey: columnKey,
  currentKey,
  currentDir,
  onToggle,
  className,
}: {
  label: string;
  sortKey: string;
  currentKey: string | null;
  currentDir: SortDir;
  onToggle: (key: string) => void;
  className?: string;
}) {
  const active = currentKey === columnKey;
  const arrow = active ? (currentDir === "asc" ? " \u25B2" : " \u25BC") : " \u25BD";
  return (
    <th
      className={`px-3 py-2 cursor-pointer select-none hover:text-slate-200 transition-colors ${className ?? ""}`}
      onClick={() => onToggle(columnKey)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onToggle(columnKey); }}
      tabIndex={0}
      role="columnheader"
      aria-sort={active ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <span className={active ? "text-blue-400" : "text-slate-600"}>{arrow}</span>
    </th>
  );
}

/* ── CSV Export ────────────────────────────────────────────────── */

export type CsvColumn<T> = {
  key: string;
  header: string;
  accessor?: (row: T) => unknown;
};

export function downloadCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: CsvColumn<T>[],
  filename: string
) {
  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) =>
    columns
      .map((c) => escape(c.accessor ? c.accessor(row) : row[c.key]))
      .join(",")
  );
  const csv = [header, ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M6 1v7M3 5.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M1 9.5v1h10v-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Export CSV
    </button>
  );
}

/* ── Truncation Warning ───────────────────────────────────────── */

export function TruncationWarning({
  count,
  limit,
  noun,
}: {
  count: number;
  limit: number;
  noun: string;
}) {
  if (count < limit) return null;
  return (
    <p className="text-xs text-amber-400 mt-2">
      Displaying {count} {noun} (results may be truncated at the {limit}-record API limit)
    </p>
  );
}
