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
