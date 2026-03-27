"use client";

import { useState, useMemo } from "react";
import { SkeletonRows, Stat } from "../shared";

type HeatmapFacility = {
  state: string;
  facility: string;
  totalInspections: number;
  oosInspections: number;
  oosRate: number;
  mostCommonGroup: string;
  topViolationCodes: { code: string; count: number }[];
};

type HeatmapData = {
  period: { start: string; end: string };
  facilities: HeatmapFacility[];
  stateStats: { state: string; totalInspections: number; oosRate: number }[];
  nationalAvgOosRate: number;
};

export function EnforcementTab({
  data,
  loading,
  error,
}: {
  data: HeatmapData | null;
  loading?: boolean;
  error?: string | null;
}) {
  const [filterState, setFilterState] = useState("");
  const [sortBy, setSortBy] = useState<"oosRate" | "totalInspections">("oosRate");

  if (loading) return <SkeletonRows count={4} />;
  if (error) return <p className="py-12 text-center text-sm text-rose-600">{error}</p>;
  if (!data || data.facilities.length === 0) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        No enforcement data available.
      </p>
    );
  }

  const uniqueStates = useMemo(
    () => [...new Set(data.facilities.map((f) => f.state))].sort(),
    [data.facilities]
  );

  const filtered = useMemo(() => {
    let list = data.facilities;
    if (filterState) list = list.filter((f) => f.state === filterState);
    return [...list].sort((a, b) =>
      sortBy === "oosRate" ? b.oosRate - a.oosRate : b.totalInspections - a.totalInspections
    );
  }, [data.facilities, filterState, sortBy]);

  const maxInspections = Math.max(...filtered.map((f) => f.totalInspections), 1);

  return (
    <div>
      {/* Summary Stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Facilities" value={data.facilities.length} />
        <Stat label="States" value={data.stateStats.length} />
        <Stat
          label="National Avg OOS Rate"
          value={`${data.nationalAvgOosRate.toFixed(1)}%`}
        />
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All States</option>
          {uniqueStates.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "oosRate" | "totalInspections")}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="oosRate">Sort by OOS Rate</option>
          <option value="totalInspections">Sort by Volume</option>
        </select>
      </div>

      {/* State Summary Bar Chart */}
      {!filterState && data.stateStats.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            OOS Rate by State
          </p>
          <div className="max-h-48 overflow-auto space-y-1">
            {[...data.stateStats]
              .sort((a, b) => b.oosRate - a.oosRate)
              .slice(0, 15)
              .map((s) => {
                const aboveAvg = s.oosRate > data.nationalAvgOosRate;
                return (
                  <div key={s.state}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 font-medium">{s.state}</span>
                      <span className={aboveAvg ? "text-rose-600 font-medium" : "text-gray-500"}>
                        {s.oosRate.toFixed(1)}% ({s.totalInspections.toLocaleString()})
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full ${aboveAvg ? "bg-rose-500" : "bg-indigo-500"}`}
                        style={{ width: `${Math.min((s.oosRate / 40) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Facility Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Facility</th>
              <th className="px-3 py-2 text-right">Inspections</th>
              <th className="px-3 py-2 text-right">OOS</th>
              <th className="px-3 py-2 text-right">OOS Rate</th>
              <th className="hidden px-3 py-2 sm:table-cell">Top Violation Group</th>
              <th className="hidden px-3 py-2 md:table-cell">Top Codes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((f, i) => {
              const aboveAvg = f.oosRate > data.nationalAvgOosRate;
              return (
                <tr
                  key={`${f.state}-${f.facility}-${i}`}
                  className="border-b border-gray-100 transition hover:bg-gray-50 even:bg-gray-50/50"
                >
                  <td className="px-3 py-2 font-medium">{f.state}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={f.facility}>
                    {f.facility}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden w-16 sm:block">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-indigo-400"
                            style={{
                              width: `${(f.totalInspections / maxInspections) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      {f.totalInspections.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {f.oosInspections > 0 ? (
                      <span className="text-rose-600">{f.oosInspections.toLocaleString()}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`font-medium ${aboveAvg ? "text-rose-600" : "text-gray-700"}`}
                    >
                      {f.oosRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell text-gray-500">
                    {f.mostCommonGroup}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell text-gray-400">
                    {f.topViolationCodes.map((c) => c.code).join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > 100 && (
        <p className="mt-2 text-center text-xs text-gray-400">
          Showing top 100 of {filtered.length} facilities
        </p>
      )}
    </div>
  );
}
