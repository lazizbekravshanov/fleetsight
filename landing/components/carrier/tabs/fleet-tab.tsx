"use client";

import { useState, useMemo } from "react";
import { Stat, SkeletonRows, useSort, SortHeader, ExportButton, downloadCsv, TruncationWarning } from "../shared";
import type { CsvColumn } from "../shared";
import type { FleetData, FleetUnit, NhtsaRecall, NhtsaDecodedVin, NhtsaComplaint } from "../types";

export function FleetTab({
  data,
  loading,
  error,
}: {
  data: FleetData | null;
  loading: boolean;
  error: string | null;
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
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        Fleet data will load when this tab is selected.
      </p>
    );
  }

  const { units, decodedVehicles, recalls, complaints } = data;

  if (units.length === 0 && decodedVehicles.length === 0) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        No fleet unit records found for this carrier.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <FleetSummary decodedVehicles={decodedVehicles} units={units} />
      <FleetComposition decodedVehicles={decodedVehicles} />
      {recalls.length > 0 && <RecallAlerts recalls={recalls} />}
      {complaints && complaints.length > 0 && <ComplaintAlerts complaints={complaints} />}
      <FleetDetailTable decodedVehicles={decodedVehicles} units={units} />
    </div>
  );
}

/* ── Fleet Summary ────────────────────────────────────────────── */

function FleetSummary({
  decodedVehicles,
  units,
}: {
  decodedVehicles: FleetData["decodedVehicles"];
  units: FleetData["units"];
}) {
  const currentYear = new Date().getFullYear();
  const years = decodedVehicles
    .map((v) => parseInt(v.modelYear, 10))
    .filter((y) => y > 1900 && y <= currentYear + 2);
  const avgAge =
    years.length > 0
      ? currentYear - Math.round(years.reduce((a, b) => a + b, 0) / years.length)
      : null;

  // Top 3 makes
  const makeCounts = new Map<string, number>();
  for (const v of decodedVehicles) {
    if (v.make) {
      const mk = v.make.toUpperCase();
      makeCounts.set(mk, (makeCounts.get(mk) || 0) + 1);
    }
  }
  const topMakes = [...makeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
        Fleet Summary
      </h3>
      <div className="flex flex-wrap gap-4 mb-4">
        <Stat label="Unit Records" value={units.length} />
        <Stat label="Decoded Vehicles" value={decodedVehicles.length} />
        {avgAge !== null && <Stat label="Avg Fleet Age" value={`${avgAge} yr`} />}
      </div>
      {topMakes.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">Top makes: </span>
          {topMakes.map(([make, count], i) => (
            <span key={make}>
              {i > 0 && ", "}
              <span className="text-gray-700">{make}</span>{" "}
              <span className="text-gray-400">({count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Fleet Composition ────────────────────────────────────────── */

function FleetComposition({
  decodedVehicles,
}: {
  decodedVehicles: FleetData["decodedVehicles"];
}) {
  if (decodedVehicles.length === 0) return null;

  // GVWR breakdown
  const gvwrCounts = new Map<string, number>();
  for (const v of decodedVehicles) {
    const cls = v.gvwr || "Unknown";
    gvwrCounts.set(cls, (gvwrCounts.get(cls) || 0) + 1);
  }
  const sortedGvwr = [...gvwrCounts.entries()].sort((a, b) => b[1] - a[1]);
  const gvwrMax = sortedGvwr[0]?.[1] ?? 1;

  // Make distribution
  const makeCounts = new Map<string, number>();
  for (const v of decodedVehicles) {
    if (v.make) {
      makeCounts.set(v.make.toUpperCase(), (makeCounts.get(v.make.toUpperCase()) || 0) + 1);
    }
  }
  const sortedMakes = [...makeCounts.entries()].sort((a, b) => b[1] - a[1]);
  const makeMax = sortedMakes[0]?.[1] ?? 1;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Fleet Composition
      </h3>
      <div className="grid gap-6 md:grid-cols-2">
        {/* GVWR Breakdown */}
        <div>
          <p className="text-xs text-gray-400 mb-2">GVWR Class</p>
          <div className="space-y-2">
            {sortedGvwr.slice(0, 6).map(([cls, count]) => (
              <div key={cls}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700 truncate max-w-[70%]">{cls}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(count / gvwrMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Make Distribution */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Make Distribution</p>
          <div className="space-y-2">
            {sortedMakes.slice(0, 6).map(([make, count]) => (
              <div key={make}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{make}</span>
                  <span className="text-gray-500">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(count / makeMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Recall Alerts ────────────────────────────────────────────── */

function RecallAlerts({ recalls }: { recalls: NhtsaRecall[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group by make/model/year
  const groups = new Map<string, NhtsaRecall[]>();
  for (const r of recalls) {
    const key = `${r.make}|${r.model}|${r.modelYear}`;
    const existing = groups.get(key) || [];
    existing.push(r);
    groups.set(key, existing);
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
        Vehicle Recall Alerts
        <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
          {recalls.length} recall{recalls.length !== 1 ? "s" : ""}
        </span>
      </h3>
      <div className="space-y-2">
        {[...groups.entries()].map(([key, groupRecalls]) => {
          const [make, model, year] = key.split("|");
          const isOpen = expanded.has(key);
          return (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50">
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs"
              >
                <span className="text-gray-700 font-medium">
                  {year} {make} {model}
                </span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700 ring-1 ring-rose-600/20">
                    {groupRecalls.length}
                  </span>
                  <span className="text-gray-400">{isOpen ? "\u25B2" : "\u25BC"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-200 px-3 py-2 space-y-3">
                  {groupRecalls.map((r, i) => (
                    <div key={i} className="text-xs">
                      <p className="text-gray-700 font-medium">
                        Campaign #{r.nhtsaCampaignNumber}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        Component: {r.component}
                      </p>
                      <p className="text-gray-500 mt-0.5">{r.summary}</p>
                      {r.consequence && (
                        <p className="text-rose-600 mt-0.5">
                          Consequence: {r.consequence}
                        </p>
                      )}
                      {r.remedy && (
                        <p className="text-gray-400 mt-0.5">
                          Remedy: {r.remedy}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Complaint Alerts ─────────────────────────────────────────── */

function ComplaintAlerts({ complaints }: { complaints: NhtsaComplaint[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Group by make/model/year
  const groups = new Map<string, NhtsaComplaint[]>();
  for (const c of complaints) {
    const key = `${c.make}|${c.model}|${c.modelYear}`;
    const existing = groups.get(key) || [];
    existing.push(c);
    groups.set(key, existing);
  }

  const crashFireCount = complaints.filter((c) => c.crash || c.fire).length;

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        NHTSA Complaints
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20">
          {complaints.length} complaint{complaints.length !== 1 ? "s" : ""}
        </span>
        {crashFireCount > 0 && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
            {crashFireCount} crash/fire
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {[...groups.entries()].map(([key, groupComplaints]) => {
          const [make, model, year] = key.split("|");
          const isOpen = expanded.has(key);
          const groupCrashFire = groupComplaints.filter((c) => c.crash || c.fire).length;
          return (
            <div key={key} className="rounded-lg border border-gray-100 bg-gray-50">
              <button
                onClick={() => toggleExpand(key)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs"
              >
                <span className="text-gray-700 font-medium">
                  {year} {make} {model}
                </span>
                <div className="flex items-center gap-2">
                  {groupCrashFire > 0 && (
                    <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700 ring-1 ring-rose-600/20">
                      {groupCrashFire} crash/fire
                    </span>
                  )}
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700 ring-1 ring-amber-600/20">
                    {groupComplaints.length}
                  </span>
                  <span className="text-gray-400">{isOpen ? "\u25B2" : "\u25BC"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-gray-200 px-3 py-2 space-y-3">
                  {groupComplaints.map((c, i) => (
                    <div key={c.odiNumber || i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-700 font-medium">
                          ODI #{c.odiNumber}
                        </p>
                        {c.crash && (
                          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
                            Crash
                          </span>
                        )}
                        {c.fire && (
                          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
                            Fire
                          </span>
                        )}
                        {c.numberOfDeaths > 0 && (
                          <span className="text-rose-600">{c.numberOfDeaths} death{c.numberOfDeaths !== 1 ? "s" : ""}</span>
                        )}
                        {c.numberOfInjuries > 0 && (
                          <span className="text-amber-600">{c.numberOfInjuries} injur{c.numberOfInjuries !== 1 ? "ies" : "y"}</span>
                        )}
                      </div>
                      {c.components && (
                        <p className="text-gray-400 mt-0.5">
                          Component: {c.components}
                        </p>
                      )}
                      {c.dateOfIncident && (
                        <p className="text-gray-400 mt-0.5">
                          Incident: {c.dateOfIncident}
                        </p>
                      )}
                      {c.summary && (
                        <p className="text-gray-500 mt-0.5 line-clamp-3">{c.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Fleet Detail Table ───────────────────────────────────────── */

type FleetRow = NhtsaDecodedVin & {
  _year: number;
  _license: string;
  _licenseState: string;
};

function FleetDetailTable({
  decodedVehicles,
  units,
}: {
  decodedVehicles: FleetData["decodedVehicles"];
  units: FleetUnit[];
}) {
  if (decodedVehicles.length === 0) return null;

  // Build VIN→unit lookup for license plates
  const vinToUnit = useMemo(() => {
    const map = new Map<string, FleetUnit>();
    for (const u of units) {
      if (u.insp_unit_vehicle_id_number) {
        map.set(u.insp_unit_vehicle_id_number.toUpperCase(), u);
      }
    }
    return map;
  }, [units]);

  const rows: FleetRow[] = decodedVehicles.map((v) => {
    const unit = v.vin ? vinToUnit.get(v.vin.toUpperCase()) : undefined;
    return {
      ...v,
      _year: parseInt(v.modelYear, 10) || 0,
      _license: unit?.insp_unit_license ?? "",
      _licenseState: unit?.insp_unit_license_state ?? "",
    };
  });

  const { sorted, sortKey, sortDir, toggle } = useSort<FleetRow>(rows);

  const csvColumns: CsvColumn<FleetRow>[] = [
    { key: "vin", header: "VIN" },
    { key: "make", header: "Make" },
    { key: "model", header: "Model" },
    { key: "modelYear", header: "Year" },
    { key: "bodyClass", header: "Body Class" },
    { key: "vehicleType", header: "Vehicle Type" },
    { key: "gvwr", header: "GVWR" },
    { key: "_license", header: "License Plate" },
    { key: "_licenseState", header: "License State" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
          Fleet Details
        </h3>
        <ExportButton onClick={() => downloadCsv(rows as unknown as Record<string, unknown>[], csvColumns as CsvColumn<Record<string, unknown>>[], "fleet.csv")} />
      </div>
      <TruncationWarning count={units.length} limit={200} noun="fleet units" />
      <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="px-3 py-2">VIN</th>
              <SortHeader label="Make" sortKey="make" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Model" sortKey="model" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <SortHeader label="Year" sortKey="_year" currentKey={sortKey} currentDir={sortDir} onToggle={toggle} />
              <th className="hidden px-3 py-2 sm:table-cell">Body Class</th>
              <th className="hidden px-3 py-2 lg:table-cell">Vehicle Type</th>
              <th className="hidden px-3 py-2 md:table-cell">GVWR</th>
              <th className="hidden px-3 py-2 lg:table-cell">License</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <tr
                key={v.vin || i}
                className="border-b border-gray-100 transition hover:bg-gray-50 even:bg-gray-50/50"
              >
                <td className="px-3 py-2 font-mono text-gray-400">
                  {v.vin || "\u2014"}
                </td>
                <td className="px-3 py-2">{v.make || "\u2014"}</td>
                <td className="px-3 py-2">{v.model || "\u2014"}</td>
                <td className="px-3 py-2">{v.modelYear || "\u2014"}</td>
                <td className="hidden px-3 py-2 sm:table-cell text-gray-500">
                  {v.bodyClass || "\u2014"}
                </td>
                <td className="hidden px-3 py-2 lg:table-cell text-gray-500">
                  {v.vehicleType || "\u2014"}
                </td>
                <td className="hidden px-3 py-2 md:table-cell text-gray-500">
                  {v.gvwr || "\u2014"}
                </td>
                <td className="hidden px-3 py-2 lg:table-cell text-gray-500">
                  {v._license
                    ? `${v._license}${v._licenseState ? ` (${v._licenseState})` : ""}`
                    : "\u2014"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
