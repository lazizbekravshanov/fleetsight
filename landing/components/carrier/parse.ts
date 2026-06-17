import type { BasicScore } from "./types";

/* ── Server-safe FMCSA payload parsing ───────────────────────────────
   Pure helpers shared by server components, API routes, and the client
   `shared.tsx` module. Kept OUT of the "use client" boundary so server
   code imports the real functions, not client-reference stubs. */

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
