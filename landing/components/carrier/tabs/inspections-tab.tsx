"use client";

import { useState, useMemo } from "react";
import type { SocrataInspection } from "@/lib/socrata";
import { decodeInspectionLevel } from "@/lib/fmcsa-codes";
import { Stat, SkeletonRows, useSort, SortHeader, ExportButton, downloadCsv, TruncationWarning } from "../shared";
import type { CsvColumn } from "../shared";

function inspDurationMinutes(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  // Times are HH:MM or HHMM format
  const parse = (t: string): number | null => {
    const clean = t.replace(":", "");
    if (clean.length < 3) return null;
    const h = parseInt(clean.slice(0, clean.length - 2), 10);
    const m = parseInt(clean.slice(-2), 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };
  const s = parse(start);
  const e = parse(end);
  if (s == null || e == null) return null;
  const diff = e - s;
  return diff >= 0 ? diff : diff + 1440; // handle midnight wrap
}

type InspRow = SocrataInspection & {
  _date: number;
  _viols: number;
  _oos: number;
  _duration: number | null;
  _level: string;
  _levelNum: number;
};

export function InspectionsTab({
  inspections,
  carrierName,
  loading,
  error,
}: {
  inspections: SocrataInspection[];
  carrierName?: string;
  loading?: boolean;
  error?: string | null;
}) {
  const [filterState, setFilterState] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [hasViolations, setHasViolations] = useState(false);
  const [hasOos, setHasOos] = useState(false);

  if (loading) {
    return <SkeletonRows count={4} />;
  }

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-rose-600">{error}</p>
    );
  }

  if (inspections.length === 0) {
    return (
      <p className="py-12 text-center text-base text-[var(--ink-muted)] tracking-wide">
        No inspection records found.
      </p>
    );
  }

  const allRows: InspRow[] = inspections.map((insp) => ({
    ...insp,
    _date: insp.insp_date ? new Date(insp.insp_date).getTime() : 0,
    _viols: parseInt(insp.viol_total ?? "0", 10) || 0,
    _oos: parseInt(insp.oos_total ?? "0", 10) || 0,
    _duration: inspDurationMinutes(insp.insp_start_time, insp.insp_end_time),
    _level: decodeInspectionLevel(insp.insp_level_id),
    _levelNum: parseInt(insp.insp_level_id ?? "0", 10) || 0,
  }));

  // Unique filter options
  const uniqueStates = [...new Set(allRows.map((r) => r.report_state).filter(Boolean))].sort() as string[];
  const uniqueLevels = [...new Set(allRows.map((r) => r._level).filter(Boolean))].sort();

  const isFiltered = filterState !== "" || filterLevel !== "" || hasViolations || hasOos;

  // Apply filters
  const rows = useMemo(() => {
    let filtered = allRows;
    if (filterState) filtered = filtered.filter((r) => r.report_state === filterState);
    if (filterLevel) filtered = filtered.filter((r) => r._level === filterLevel);
    if (hasViolations) filtered = filtered.filter((r) => r._viols > 0);
    if (hasOos) filtered = filtered.filter((r) => r._oos > 0);
    return filtered;
  }, [allRows, filterState, filterLevel, hasViolations, hasOos]);

  const totalViols = rows.reduce((s, i) => s + i._viols, 0);
  const totalOos = rows.reduce((s, i) => s + i._oos, 0);

  // Level distribution (from filtered data)
  const levelCounts = new Map<string, number>();
  for (const r of rows) {
    const lbl = r._level;
    levelCounts.set(lbl, (levelCounts.get(lbl) || 0) + 1);
  }
  const sortedLevels = [...levelCounts.entries()].sort((a, b) => b[1] - a[1]);
  const levelMax = sortedLevels[0]?.[1] ?? 1;

  const { sorted, sortKey, sortDir, toggle } = useSort<InspRow>(rows, "_date", "desc");

  const csvColumns: CsvColumn<InspRow>[] = [
    { key: "insp_date", header: "Date" },
    { key: "report_number", header: "Report #" },
    { key: "report_state", header: "State" },
    { key: "_level", header: "Level" },
    { key: "_viols", header: "Violations" },
    { key: "_oos", header: "OOS" },
    { key: "_duration", header: "Duration (min)" },
    { key: "insp_carrier_name", header: "Carrier Name" },
    { key: "post_acc_ind", header: "Post Accident" },
    { key: "gross_comb_veh_wt", header: "Weight (lbs)" },
    { key: "location_desc", header: "Location" },
  ];

  function clearFilters() {
    setFilterState("");
    setFilterLevel("");
    setHasViolations(false);
    setHasOos(false);
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="rounded-lg border border-border bg-[var(--surface-1)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All States</option>
          {uniqueStates.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-lg border border-border bg-[var(--surface-1)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All Levels</option>
          {uniqueLevels.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)] cursor-pointer">
          <input
            type="checkbox"
            checked={hasViolations}
            onChange={(e) => setHasViolations(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          Has violations
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)] cursor-pointer">
          <input
            type="checkbox"
            checked={hasOos}
            onChange={(e) => setHasOos(e.target.checked)}
            className="rounded border-border text-accent focus:ring-accent"
          />
          Has OOS
        </label>
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-accent hover:text-accent transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <Stat
          label="Total Inspections"
          value={isFiltered ? `${rows.length} of ${inspections.length}` : inspections.length}
        />
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="Out of Service" value={totalOos} />
        <Stat
          label="OOS Rate"
          value={
            rows.length > 0
              ? `${((totalOos / rows.length) * 100).toFixed(1)}%`
              : "N/A"
          }
        />
        <ExportButton onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], csvColumns as CsvColumn<Record<string, unknown>>[], "inspections.csv")} />
      </div>

      <TruncationWarning count={inspections.length} limit={100} noun="inspections" />

      {/* Level Distribution */}
      {sortedLevels.length > 1 && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)] mb-2">Inspection Level Distribution</p>
          <div className="space-y-1.5">
            {sortedLevels.map(([level, count]) => (
              <div key={level}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-[var(--ink-soft)]">{level}</span>
                  <span className="text-[var(--ink-soft)]">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent-soft0"
                    style={{ width: `${(count / levelMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-xs text-[var(--ink-soft)]">
          <thead className="sticky top-0 bg-[var(--surface-2)]">
            <tr className="border-b border-[var(--border)] text-[var(--ink-soft)]">
              <SortHeader label="Date" sortKey="_date" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Report #" sortKey="report_number" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="hidden sm:table-cell" />
              <SortHeader label="State" sortKey="report_state" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Level" sortKey="_levelNum" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Violations" sortKey="_viols" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="text-right" />
              <SortHeader label="OOS" sortKey="_oos" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="text-right" />
              <SortHeader label="Duration" sortKey="_duration" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="hidden md:table-cell text-right" />
              <th className="hidden px-3 py-2 lg:table-cell">Carrier Name</th>
              <th className="hidden px-3 py-2 text-center md:table-cell">
                Post-Acc
              </th>
              <th className="hidden px-3 py-2 text-right lg:table-cell">
                Weight (lbs)
              </th>
              <th className="hidden px-3 py-2 sm:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((insp, i) => {
              const isShortL1 = insp._levelNum === 1 && insp._duration !== null && insp._duration < 30;
              const namesDiffer =
                carrierName &&
                insp.insp_carrier_name &&
                insp.insp_carrier_name.toUpperCase() !== carrierName.toUpperCase();

              return (
                <tr
                  key={insp.inspection_id ?? i}
                  className="border-b border-[var(--border)] transition hover:bg-[var(--surface-2)] even:bg-[var(--surface-2)]/50"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {insp.insp_date
                      ? new Date(insp.insp_date).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell text-[var(--ink-muted)]">
                    {insp.report_number ?? "\u2014"}
                  </td>
                  <td className="px-3 py-2">{insp.report_state ?? "\u2014"}</td>
                  <td className="px-3 py-2">{insp._level}</td>
                  <td className="px-3 py-2 text-right">
                    {insp.viol_total ?? "0"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {insp._oos > 0 ? (
                      <span className="text-rose-600">{insp.oos_total}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className={`hidden px-3 py-2 md:table-cell text-right ${isShortL1 ? "text-rose-600" : "text-[var(--ink-muted)]"}`}>
                    {insp._duration !== null
                      ? `${insp._duration} min`
                      : "\u2014"}
                  </td>
                  <td className={`hidden px-3 py-2 lg:table-cell ${namesDiffer ? "text-amber-600" : "text-[var(--ink-muted)]"}`}>
                    {insp.insp_carrier_name ?? "\u2014"}
                  </td>
                  <td className="hidden px-3 py-2 text-center md:table-cell">
                    {insp.post_acc_ind === "Y" ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-600/20">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[var(--ink-muted)]">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right lg:table-cell text-[var(--ink-muted)]">
                    {insp.gross_comb_veh_wt
                      ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td
                    className="hidden px-3 py-2 sm:table-cell text-[var(--ink-muted)]"
                    title={insp.insp_facility ?? undefined}
                  >
                    {insp.location_desc ?? "\u2014"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
