"use client";

import dynamic from "next/dynamic";
import type { SocrataCrash } from "@/lib/socrata";

const CrashMapInner = dynamic(() => import("./crash-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
      <span className="text-xs text-[var(--ink-muted)]">Loading map...</span>
    </div>
  ),
});

export function CrashMap({ crashes }: { crashes: SocrataCrash[] }) {
  if (crashes.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
          Crash Map
        </p>
        <span className="text-[10px] text-[var(--ink-muted)]">
          {crashes.length} crash{crashes.length !== 1 ? "es" : ""}
        </span>
      </div>
      <CrashMapInner crashes={crashes} />
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600 opacity-80" />
          Fatal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 opacity-80" />
          Injury
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-500 opacity-80" />
          Tow-away
        </span>
        <span className="ml-auto">Hover for details</span>
      </div>
    </div>
  );
}
