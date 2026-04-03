"use client";

import dynamic from "next/dynamic";

type InspectionLike = {
  report_state?: string;
  vehicle_viol_total?: string;
  driver_viol_total?: string;
  oos_total?: string;
};

const InspectionMapInner = dynamic(() => import("./inspection-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center" style={{ minHeight: 340 }}>
      <div className="flex flex-col items-center gap-2">
        <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="text-xs text-[var(--ink-muted)]">Loading map...</span>
      </div>
    </div>
  ),
});

export function InspectionHeatmap({ inspections }: { inspections: InspectionLike[] }) {
  if (inspections.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
          Inspection Map
        </p>
        <span className="text-[10px] text-[var(--ink-muted)]">
          {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
        </span>
      </div>
      <InspectionMapInner inspections={inspections} />
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent opacity-70" />
          Inspections
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500 opacity-70" />
          Has OOS violations
        </span>
        <span className="ml-auto">Click a dot or state for details</span>
      </div>
    </div>
  );
}
