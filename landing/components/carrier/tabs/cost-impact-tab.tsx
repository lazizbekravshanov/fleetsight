"use client";

import { Stat, SkeletonRows, useSort, SortHeader } from "../shared";

/* ── Types ───────────────────────────────────────────────────── */

type ViolationCostBreakdown = {
  code: string;
  description: string;
  oosCount: number;
  estimatedDirectCost: number;
  estimatedRevenueLost: number;
  estimatedTotal: number;
};

type CostImpactReport = {
  dotNumber: number;
  period: { start: string; end: string };
  inputs: {
    avgTowCost: number;
    avgRepairCost: number;
    avgDelayHours: number;
    revenuePerMile: number;
    avgDailyMiles: number;
  };
  dailyRevenuePerTruck: number;
  annualOOSEvents: number;
  annualDirectCost: number;
  annualRevenueLost: number;
  estimatedInsurancePremiumIncrease: number;
  totalAnnualImpact: number;
  projectedOOSEventsIfFixed: number;
  projectedAnnualSavings: number;
  projectedInsuranceSavings: number;
  totalProjectedSavings: number;
  topCostlyViolations: ViolationCostBreakdown[];
  topActions: { action: string; eliminates: number; savings: number }[];
};

/* ── Helpers ──────────────────────────────────────────────────── */

function fmtCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

/* ── Component ────────────────────────────────────────────────── */

export function CostImpactTab({
  data,
  loading,
  error,
}: {
  data: CostImpactReport | null;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <SkeletonRows count={4} />;
  }

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-rose-600">{error}</p>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-base text-[var(--ink-muted)] tracking-wide">
        No cost impact data available.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period header */}
      <p className="text-xs text-[var(--ink-soft)]">
        Analysis period: {data.period.start} &ndash; {data.period.end} &middot; DOT #{data.dotNumber}
      </p>

      {/* ── Current Impact Banner ──────────────────────────────── */}
      <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50 p-5">
        <h3 className="mb-3 text-sm font-semibold text-rose-800">
          Current Annual OOS Cost Impact
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="OOS Events" value={data.annualOOSEvents} />
          <Stat label="Direct Costs" value={fmtCurrency(data.annualDirectCost)} warn />
          <Stat label="Revenue Lost" value={fmtCurrency(data.annualRevenueLost)} warn />
          <Stat
            label="Insurance Impact"
            value={fmtCurrency(data.estimatedInsurancePremiumIncrease)}
            warn
          />
          <Stat
            label="Total Annual Impact"
            value={fmtCurrency(data.totalAnnualImpact)}
            warn
          />
        </div>
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          Based on avg tow {fmtCurrency(data.inputs.avgTowCost)}, repair {fmtCurrency(data.inputs.avgRepairCost)}, {data.inputs.avgDelayHours}h delay, {fmtCurrency(data.inputs.revenuePerMile)}/mi, {data.inputs.avgDailyMiles.toLocaleString()} mi/day ({fmtCurrency(data.dailyRevenuePerTruck)}/day/truck)
        </p>
      </div>

      {/* ── If-Fixed Projection ────────────────────────────────── */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-5">
        <h3 className="mb-3 text-sm font-semibold text-emerald-800">
          Projected Savings If Top Violations Fixed
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="h-0.5 bg-emerald-500" />
            <div className="px-4 py-2">
              <p className="text-xs text-[var(--ink-soft)]">Projected OOS Events</p>
              <p className="text-xl font-semibold text-[var(--ink)]">
                {data.projectedOOSEventsIfFixed}
                <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
                  (down from {data.annualOOSEvents})
                </span>
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="h-0.5 bg-emerald-500" />
            <div className="px-4 py-2">
              <p className="text-xs text-[var(--ink-soft)]">Projected Savings</p>
              <p className="text-xl font-semibold text-emerald-700">
                {fmtCurrency(data.projectedAnnualSavings)}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="h-0.5 bg-emerald-500" />
            <div className="px-4 py-2">
              <p className="text-xs text-[var(--ink-soft)]">Insurance Savings</p>
              <p className="text-xl font-semibold text-emerald-700">
                {fmtCurrency(data.projectedInsuranceSavings)}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="h-0.5 bg-emerald-500" />
            <div className="px-4 py-2">
              <p className="text-xs text-[var(--ink-soft)]">Total Projected Savings</p>
              <p className="text-xl font-semibold text-emerald-700">
                {fmtCurrency(data.totalProjectedSavings)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Costly Violations Table ────────────────────────── */}
      <TopCostlyViolationsTable violations={data.topCostlyViolations} />

      {/* ── Top Actions ────────────────────────────────────────── */}
      <TopActionsPanel actions={data.topActions} />
    </div>
  );
}

/* ── Top Costly Violations ────────────────────────────────────── */

function TopCostlyViolationsTable({
  violations,
}: {
  violations: ViolationCostBreakdown[];
}) {
  const { sorted, sortKey, sortDir, toggle } = useSort<ViolationCostBreakdown>(
    violations,
    "estimatedTotal",
    "desc"
  );

  if (violations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--ink-muted)]">
        No violation cost breakdowns available.
      </p>
    );
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">
        Top Costly Violations
      </h3>
      <div className="max-h-[28rem] overflow-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-xs text-[var(--ink-soft)]">
          <thead className="sticky top-0 bg-[var(--surface-2)]">
            <tr className="border-b border-[var(--border)] text-[var(--ink-soft)]">
              <SortHeader
                label="Code"
                sortKey="code"
                currentKey={sortKey}
                currentDir={sortDir}
                onToggle={toggle}
              />
              <th className="px-3 py-2">Description</th>
              <SortHeader
                label="OOS Count"
                sortKey="oosCount"
                currentKey={sortKey}
                currentDir={sortDir}
                onToggle={toggle}
                className="text-right"
              />
              <SortHeader
                label="Direct Cost"
                sortKey="estimatedDirectCost"
                currentKey={sortKey}
                currentDir={sortDir}
                onToggle={toggle}
                className="text-right"
              />
              <SortHeader
                label="Revenue Lost"
                sortKey="estimatedRevenueLost"
                currentKey={sortKey}
                currentDir={sortDir}
                onToggle={toggle}
                className="text-right"
              />
              <SortHeader
                label="Total"
                sortKey="estimatedTotal"
                currentKey={sortKey}
                currentDir={sortDir}
                onToggle={toggle}
                className="text-right"
              />
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <tr
                key={v.code + "-" + i}
                className="border-b border-[var(--border)] transition hover:bg-[var(--surface-2)] even:bg-[var(--surface-2)]/50"
              >
                <td className="px-3 py-2 whitespace-nowrap font-mono text-accent">
                  {v.code}
                </td>
                <td className="px-3 py-2 max-w-xs truncate" title={v.description}>
                  {v.description}
                </td>
                <td className="px-3 py-2 text-right">{v.oosCount}</td>
                <td className="px-3 py-2 text-right text-rose-600">
                  {fmtCurrency(v.estimatedDirectCost)}
                </td>
                <td className="px-3 py-2 text-right text-rose-600">
                  {fmtCurrency(v.estimatedRevenueLost)}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-rose-700">
                  {fmtCurrency(v.estimatedTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Top Actions Panel ────────────────────────────────────────── */

function TopActionsPanel({
  actions,
}: {
  actions: { action: string; eliminates: number; savings: number }[];
}) {
  if (actions.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">
        Recommended Actions
      </h3>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition hover:bg-[var(--surface-2)]"
          >
            {/* checkbox-style indicator */}
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent-soft text-accent">
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className="opacity-0"
              >
                <path
                  d="M1.5 5.5L4 8L8.5 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute text-xs font-bold">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[var(--ink)]">{a.action}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--ink-soft)]">
                <span>
                  Eliminates{" "}
                  <span className="font-semibold text-[var(--ink-soft)]">
                    {a.eliminates}
                  </span>{" "}
                  OOS events
                </span>
                <span>
                  Saves{" "}
                  <span className="font-semibold text-emerald-700">
                    {fmtCurrency(a.savings)}
                  </span>
                  /yr
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
