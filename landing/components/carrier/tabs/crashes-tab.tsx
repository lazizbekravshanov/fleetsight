"use client";

import { useState, useMemo } from "react";
import type { SocrataCrash } from "@/lib/socrata";
import { decodeVehicleConfig, decodeCargoBodyType } from "@/lib/fmcsa-codes";
import { Stat, SkeletonRows, useSort, SortHeader, ExportButton, downloadCsv, TruncationWarning } from "../shared";
import type { CsvColumn } from "../shared";

type CrashRow = SocrataCrash & {
  _date: number;
  _fatalities: number;
  _injuries: number;
  _towAway: number;
  _stateRec: string;
};

export function CrashesTab({
  crashes,
  loading,
  error,
}: {
  crashes: SocrataCrash[];
  loading?: boolean;
  error?: string | null;
}) {
  const [filterState, setFilterState] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [fedRecordable, setFedRecordable] = useState(false);

  if (loading) {
    return <SkeletonRows count={4} />;
  }

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-rose-600">{error}</p>
    );
  }

  if (crashes.length === 0) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        No crash records found.
      </p>
    );
  }

  const allRows: CrashRow[] = crashes.map((cr) => ({
    ...cr,
    _date: cr.report_date ? new Date(cr.report_date).getTime() : 0,
    _fatalities: parseInt(cr.fatalities ?? "0", 10) || 0,
    _injuries: parseInt(cr.injuries ?? "0", 10) || 0,
    _towAway: parseInt(cr.tow_away ?? "0", 10) || 0,
    _stateRec: cr.state_recordable ?? "",
  }));

  const uniqueStates = [...new Set(allRows.map((r) => r.report_state).filter(Boolean))].sort() as string[];
  const isFiltered = filterState !== "" || filterSeverity !== "" || fedRecordable;

  const rows = useMemo(() => {
    let filtered = allRows;
    if (filterState) filtered = filtered.filter((r) => r.report_state === filterState);
    if (filterSeverity === "fatal") filtered = filtered.filter((r) => r._fatalities > 0);
    else if (filterSeverity === "injury") filtered = filtered.filter((r) => r._injuries > 0);
    else if (filterSeverity === "tow") filtered = filtered.filter((r) => r._towAway > 0);
    if (fedRecordable) filtered = filtered.filter((r) => r.federal_recordable === "Y");
    return filtered;
  }, [allRows, filterState, filterSeverity, fedRecordable]);

  const totalFatalities = rows.reduce((s, c) => s + c._fatalities, 0);
  const totalInjuries = rows.reduce((s, c) => s + c._injuries, 0);
  const totalTowAway = rows.reduce((s, c) => s + c._towAway, 0);

  // Severity score: fatal*3 + injury*2 + tow*1
  const severityScore = totalFatalities * 3 + totalInjuries * 2 + totalTowAway;

  const { sorted, sortKey, sortDir, toggle } = useSort<CrashRow>(rows, "_date", "desc");

  const csvColumns: CsvColumn<CrashRow>[] = [
    { key: "report_date", header: "Date" },
    { key: "report_number", header: "Report #" },
    { key: "report_state", header: "State" },
    { key: "city", header: "City" },
    { key: "location", header: "Location" },
    { key: "truck_bus_ind", header: "Vehicle" },
    { key: "cargo_body_type_id", header: "Cargo Body Type", accessor: (r) => r.cargo_body_type_id ? decodeCargoBodyType(r.cargo_body_type_id) : "" },
    { key: "fatalities", header: "Fatalities" },
    { key: "injuries", header: "Injuries" },
    { key: "tow_away", header: "Tow Away" },
    { key: "federal_recordable", header: "Federal Recordable" },
    { key: "state_recordable", header: "State Recordable" },
  ];

  function clearFilters() {
    setFilterState("");
    setFilterSeverity("");
    setFedRecordable(false);
  }

  return (
    <div>
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
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Severities</option>
          <option value="fatal">Fatal only</option>
          <option value="injury">Injuries only</option>
          <option value="tow">Tow-away only</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={fedRecordable}
            onChange={(e) => setFedRecordable(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Federal recordable
        </label>
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap items-start gap-4">
        <Stat
          label="Total Crashes"
          value={isFiltered ? `${rows.length} of ${crashes.length}` : crashes.length}
        />
        <Stat label="Fatalities" value={totalFatalities} warn />
        <Stat
          label="Injuries"
          value={totalInjuries}
          warn={totalInjuries > 0}
        />
        <Stat label="Tow-Aways" value={totalTowAway} />
        <Stat label="Severity Score" value={severityScore} warn={severityScore > 10} />
        <ExportButton onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], csvColumns as CsvColumn<Record<string, unknown>>[], "crashes.csv")} />
      </div>

      <TruncationWarning count={crashes.length} limit={50} noun="crashes" />

      {/* Table */}
      <div className="mt-2 max-h-[32rem] overflow-auto rounded-xl border border-gray-200">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-500">
              <SortHeader label="Date" sortKey="_date" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Report #" sortKey="report_number" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="hidden sm:table-cell" />
              <SortHeader label="State" sortKey="report_state" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <th className="hidden px-3 py-2 sm:table-cell">City</th>
              <th className="hidden px-3 py-2 sm:table-cell">Location</th>
              <th className="hidden px-3 py-2 md:table-cell">Vehicle</th>
              <th className="hidden px-3 py-2 md:table-cell">Cargo</th>
              <SortHeader label="Fatal" sortKey="_fatalities" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="text-right" />
              <SortHeader label="Injuries" sortKey="_injuries" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="text-right" />
              <SortHeader label="Tow" sortKey="_towAway" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} className="text-right" />
              <th className="hidden px-3 py-2 text-center lg:table-cell">Fed Rec.</th>
              <th className="hidden px-3 py-2 text-center lg:table-cell">State Rec.</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((cr, i) => (
              <tr
                key={cr.crash_id ?? i}
                className="border-b border-gray-100 transition hover:bg-gray-50 even:bg-gray-50/50"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date
                    ? new Date(cr.report_date).toLocaleDateString()
                    : "\u2014"}
                  {cr.report_time && (
                    <span className="ml-1 text-gray-400">
                      {cr.report_time}
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-gray-400">
                  {cr.report_number ?? "\u2014"}
                </td>
                <td className="px-3 py-2">{cr.report_state ?? "\u2014"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {cr.city ?? "\u2014"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-gray-400">
                  {cr.location ?? "\u2014"}
                </td>
                <td
                  className="hidden px-3 py-2 md:table-cell text-gray-500"
                  title={
                    cr.vehicle_configuration_id
                      ? decodeVehicleConfig(cr.vehicle_configuration_id)
                      : undefined
                  }
                >
                  {cr.truck_bus_ind === "TRUCK"
                    ? "Truck"
                    : cr.truck_bus_ind === "BUS"
                      ? "Bus"
                      : cr.truck_bus_ind ?? "\u2014"}
                  {cr.vehicle_configuration_id && (
                    <span className="ml-1 text-gray-400">
                      ({decodeVehicleConfig(cr.vehicle_configuration_id)})
                    </span>
                  )}
                </td>
                <td className="hidden px-3 py-2 md:table-cell text-gray-400">
                  {cr.cargo_body_type_id
                    ? decodeCargoBodyType(cr.cargo_body_type_id)
                    : "\u2014"}
                </td>
                <td className="px-3 py-2 text-right">
                  {cr._fatalities > 0 ? (
                    <span className="text-rose-600">{cr.fatalities}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {cr._injuries > 0 ? (
                    <span className="text-amber-600">{cr.injuries}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {cr.tow_away ?? "0"}
                </td>
                <td className="hidden px-3 py-2 text-center lg:table-cell">
                  {cr.federal_recordable === "Y" ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-600/20">
                      Yes
                    </span>
                  ) : cr.federal_recordable === "N" ? (
                    <span className="text-gray-400">No</span>
                  ) : (
                    <span className="text-gray-400">{"\u2014"}</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-center lg:table-cell">
                  {cr.state_recordable === "Y" ? (
                    <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-600/20">
                      Yes
                    </span>
                  ) : cr.state_recordable === "N" ? (
                    <span className="text-gray-400">No</span>
                  ) : (
                    <span className="text-gray-400">{"\u2014"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
