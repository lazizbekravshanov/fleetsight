"use client";

import type { SocrataInspection } from "@/lib/socrata";
import { decodeInspectionLevel } from "@/lib/fmcsa-codes";
import { Stat, useSort, SortHeader, ExportButton, downloadCsv, TruncationWarning } from "../shared";
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
}: {
  inspections: SocrataInspection[];
  carrierName?: string;
}) {
  if (inspections.length === 0) {
    return (
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
        No inspection records found.
      </p>
    );
  }

  const rows: InspRow[] = inspections.map((insp) => ({
    ...insp,
    _date: insp.insp_date ? new Date(insp.insp_date).getTime() : 0,
    _viols: parseInt(insp.viol_total ?? "0", 10) || 0,
    _oos: parseInt(insp.oos_total ?? "0", 10) || 0,
    _duration: inspDurationMinutes(insp.insp_start_time, insp.insp_end_time),
    _level: decodeInspectionLevel(insp.insp_level_id),
    _levelNum: parseInt(insp.insp_level_id ?? "0", 10) || 0,
  }));

  const totalViols = rows.reduce((s, i) => s + i._viols, 0);
  const totalOos = rows.reduce((s, i) => s + i._oos, 0);

  // Level distribution
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

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <Stat label="Total Inspections" value={inspections.length} />
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="Out of Service" value={totalOos} />
        <Stat
          label="OOS Rate"
          value={
            inspections.length > 0
              ? `${((totalOos / inspections.length) * 100).toFixed(1)}%`
              : "N/A"
          }
        />
        <ExportButton onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], csvColumns as CsvColumn<Record<string, unknown>>[], "inspections.csv")} />
      </div>

      <TruncationWarning count={inspections.length} limit={100} noun="inspections" />

      {/* Level Distribution */}
      {sortedLevels.length > 1 && (
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Inspection Level Distribution</p>
          <div className="space-y-1.5">
            {sortedLevels.map(([level, count]) => (
              <div key={level}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-300">{level}</span>
                  <span className="text-slate-400">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${(count / levelMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-700 text-slate-400">
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
                  className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {insp.insp_date
                      ? new Date(insp.insp_date).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
                    {insp.report_number ?? "\u2014"}
                  </td>
                  <td className="px-3 py-2">{insp.report_state ?? "\u2014"}</td>
                  <td className="px-3 py-2">{insp._level}</td>
                  <td className="px-3 py-2 text-right">
                    {insp.viol_total ?? "0"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {insp._oos > 0 ? (
                      <span className="text-rose-400">{insp.oos_total}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className={`hidden px-3 py-2 md:table-cell text-right ${isShortL1 ? "text-rose-400" : "text-slate-500"}`}>
                    {insp._duration !== null
                      ? `${insp._duration} min`
                      : "\u2014"}
                  </td>
                  <td className={`hidden px-3 py-2 lg:table-cell ${namesDiffer ? "text-amber-400" : "text-slate-500"}`}>
                    {insp.insp_carrier_name ?? "\u2014"}
                  </td>
                  <td className="hidden px-3 py-2 text-center md:table-cell">
                    {insp.post_acc_ind === "Y" ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                        Yes
                      </span>
                    ) : (
                      <span className="text-slate-600">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right lg:table-cell text-slate-500">
                    {insp.gross_comb_veh_wt
                      ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString()
                      : "\u2014"}
                  </td>
                  <td
                    className="hidden px-3 py-2 sm:table-cell text-slate-500"
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
