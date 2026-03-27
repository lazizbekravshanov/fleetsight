"use client";

import { useState, useMemo } from "react";
import { SkeletonRows, Stat } from "../shared";

type DriverScorecard = {
  cdlKey: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  cleanRate: number;
  driverOOSEvents: number;
  vehicleOOSEvents: number;
  topDriverViolations: { code: string; description: string; count: number; group: string }[];
  topVehicleViolations: { code: string; description: string; count: number; group: string }[];
  companyAvgCleanRate: number | null;
  performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
  trainingRecommendations: string[];
  estimatedRiskReduction: string;
};

type DriverSummary = {
  cdlKey: string;
  inspections: number;
  violations: number;
  oosEvents: number;
  cleanRate: number;
};

export function DriverScorecardTab({
  scorecards,
  driverList,
  loading,
  error,
  onSelectDriver,
}: {
  scorecards: Map<string, DriverScorecard>;
  driverList: DriverSummary[];
  loading?: boolean;
  error?: string | null;
  onSelectDriver?: (cdlKey: string) => void;
}) {
  const [selectedCdl, setSelectedCdl] = useState<string | null>(null);

  if (loading) return <SkeletonRows count={4} />;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (driverList.length === 0) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        No driver inspection data available.
      </p>
    );
  }

  const sorted = useMemo(
    () => [...driverList].sort((a, b) => b.oosEvents - a.oosEvents),
    [driverList]
  );

  const selected = selectedCdl ? scorecards.get(selectedCdl) : null;

  function handleSelect(cdlKey: string) {
    setSelectedCdl(cdlKey);
    onSelectDriver?.(cdlKey);
  }

  return (
    <div>
      {/* Driver Comparison Table */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Driver Comparison
        </p>
        <div className="max-h-64 overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="px-3 py-2">CDL Key</th>
                <th className="px-3 py-2 text-right">Inspections</th>
                <th className="px-3 py-2 text-right">Violations</th>
                <th className="px-3 py-2 text-right">OOS</th>
                <th className="px-3 py-2 text-right">Clean Rate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => (
                <tr
                  key={d.cdlKey}
                  onClick={() => handleSelect(d.cdlKey)}
                  className={`cursor-pointer border-b border-gray-100 transition hover:bg-indigo-50 ${
                    selectedCdl === d.cdlKey
                      ? "bg-indigo-50"
                      : i < 3 && d.oosEvents > 0
                        ? "bg-rose-50/30"
                        : "even:bg-gray-50/50"
                  }`}
                >
                  <td className="px-3 py-2 font-medium">
                    {d.cdlKey.length > 20
                      ? d.cdlKey.slice(0, 20) + "..."
                      : d.cdlKey}
                  </td>
                  <td className="px-3 py-2 text-right">{d.inspections}</td>
                  <td className="px-3 py-2 text-right">{d.violations}</td>
                  <td className="px-3 py-2 text-right">
                    {d.oosEvents > 0 ? (
                      <span className="text-rose-600">{d.oosEvents}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {Math.round(d.cleanRate)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Driver Detail */}
      {selected && (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Driver: {selected.cdlKey}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(selected.period.start).toLocaleDateString()} &ndash;{" "}
                  {new Date(selected.period.end).toLocaleDateString()}
                </p>
              </div>
              <TrendBadge trend={selected.performanceTrend} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            <Stat label="Inspections" value={selected.totalInspections} />
            <Stat label="Clean Rate" value={`${Math.round(selected.cleanRate)}%`} />
            <Stat label="Driver OOS" value={selected.driverOOSEvents} warn={selected.driverOOSEvents > 0} />
            <Stat label="Vehicle OOS" value={selected.vehicleOOSEvents} warn={selected.vehicleOOSEvents > 0} />
            {selected.companyAvgCleanRate !== null && (
              <Stat
                label="Company Avg Clean Rate"
                value={`${Math.round(selected.companyAvgCleanRate)}%`}
              />
            )}
          </div>

          {/* Violation Breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Driver Violations */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Driver Violations
              </p>
              {selected.topDriverViolations.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <div className="space-y-1.5">
                  {selected.topDriverViolations.map((v) => (
                    <div key={v.code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate mr-2" title={v.description}>
                        {v.code}
                      </span>
                      <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                        {v.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle Violations */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Vehicle Violations
              </p>
              {selected.topVehicleViolations.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <div className="space-y-1.5">
                  {selected.topVehicleViolations.map((v) => (
                    <div key={v.code} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700 truncate mr-2" title={v.description}>
                        {v.code}
                      </span>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                        {v.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Training Recommendations */}
          {selected.trainingRecommendations.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Training Recommendations
              </p>
              <ul className="space-y-1.5">
                {selected.trainingRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-indigo-800">
                    <span className="mt-0.5 shrink-0 text-indigo-400">&bull;</span>
                    {rec}
                  </li>
                ))}
              </ul>
              {selected.estimatedRiskReduction && (
                <p className="mt-2 text-xs font-medium text-indigo-700">
                  {selected.estimatedRiskReduction}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {!selected && (
        <p className="py-8 text-center text-sm text-gray-400">
          Click a driver above to view their detailed scorecard.
        </p>
      )}
    </div>
  );
}

function TrendBadge({ trend }: { trend: "IMPROVING" | "STABLE" | "DECLINING" }) {
  const config = {
    IMPROVING: { label: "Improving", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" },
    STABLE: { label: "Stable", className: "bg-gray-100 text-gray-600 ring-1 ring-gray-400/20" },
    DECLINING: { label: "Declining", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20" },
  };
  const c = config[trend];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}
