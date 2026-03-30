"use client";

import { SkeletonRows, Stat } from "../shared";

type PreTripFocusItem = {
  rank: number;
  code: string;
  description: string;
  group: string;
  count: number;
  oosCount: number;
  checkItem: string;
  fixAction: string;
  lastViolationDate: string | null;
  lastViolationLocation: string | null;
};

type PreTripFocusSheet = {
  vin: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  currentCleanRate: number;
  projectedCleanRate: number;
  focusItems: PreTripFocusItem[];
};

export function PreTripTab({
  data,
  loading,
  error,
}: {
  data: PreTripFocusSheet | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) return <SkeletonRows count={3} />;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="py-12 text-center text-base text-[var(--ink-muted)] tracking-wide">Select a vehicle to view its pre-trip focus sheet.</p>;
  if (data.focusItems.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-base text-emerald-600 font-medium">No violation history for this vehicle.</p>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Standard pre-trip inspection procedures apply.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Pre-Trip Focus Sheet
            </h3>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
              VIN: {data.vin}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--ink-soft)]">
              {new Date(data.period.start).toLocaleDateString()} &ndash;{" "}
              {new Date(data.period.end).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Inspections" value={data.totalInspections} />
        <Stat label="Clean Inspections" value={data.cleanInspections} />
        <Stat label="Current Clean Rate" value={`${Math.round(data.currentCleanRate)}%`} />
        <Stat
          label="Projected Clean Rate"
          value={`${Math.round(data.projectedCleanRate)}%`}
          warn={false}
        />
      </div>

      {/* Clean rate improvement */}
      {data.projectedCleanRate > data.currentCleanRate && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Addressing these items could improve clean inspection rate from{" "}
            <span className="font-bold">{Math.round(data.currentCleanRate)}%</span> to{" "}
            <span className="font-bold">{Math.round(data.projectedCleanRate)}%</span>
          </p>
        </div>
      )}

      {/* Focus Items */}
      <div className="space-y-3">
        {data.focusItems.map((item) => (
          <div
            key={item.code}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {item.rank}
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {item.code} &mdash; {item.description}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                    Group: {item.group} &middot; Flagged{" "}
                    <span className="font-medium text-rose-600">
                      {item.count} time{item.count !== 1 ? "s" : ""}
                    </span>
                    {item.oosCount > 0 && (
                      <span className="text-rose-600">
                        {" "}({item.oosCount} OOS)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {item.lastViolationDate && (
                <div className="shrink-0 text-right">
                  <p className="text-xs text-[var(--ink-muted)]">Last violation</p>
                  <p className="text-xs text-[var(--ink-soft)]">
                    {new Date(item.lastViolationDate).toLocaleDateString()}
                  </p>
                  {item.lastViolationLocation && (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {item.lastViolationLocation}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action items */}
            <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-indigo-500">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-medium text-[var(--ink-soft)]">Check</p>
                  <p className="text-xs text-[var(--ink-soft)]">{item.checkItem}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-500">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 8l3 3 5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-medium text-[var(--ink-soft)]">Fix Action</p>
                  <p className="text-xs text-[var(--ink-soft)]">{item.fixAction}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
