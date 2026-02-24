"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { SocrataInspection } from "@/lib/socrata";
import { Stat, parseBasics } from "../shared";
import type { BasicScore } from "../types";

export function SafetyTab({
  basics,
  inspections,
}: {
  basics: unknown;
  inspections: SocrataInspection[];
}) {
  const scores = parseBasics(basics);

  return (
    <div className="space-y-6">
      {/* BASIC Score Gauges */}
      <BasicGauges scores={scores} basicsAvailable={basics !== null} />

      {/* Violation Breakdown (derived from inspections) */}
      <ViolationBreakdown inspections={inspections} />

      {/* Violation Trend Chart */}
      {inspections.length > 0 && <ViolationTrendChart inspections={inspections} />}

      {/* OOS Rate Trend Chart */}
      {inspections.length > 0 && <OosRateTrendChart inspections={inspections} />}
    </div>
  );
}

/* ── BASIC Score Gauges ───────────────────────────────────────── */

function BasicGauges({
  scores,
  basicsAvailable,
}: {
  scores: BasicScore[];
  basicsAvailable: boolean;
}) {
  if (!basicsAvailable) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
          BASIC Safety Scores
        </h3>
        <p className="text-sm text-gray-400 tracking-wide">
          Safety scores unavailable &mdash; FMCSA WEBKEY not configured
        </p>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
          BASIC Safety Scores
        </h3>
        <p className="text-sm text-gray-400 tracking-wide">
          No BASIC scores available for this carrier.
        </p>
      </div>
    );
  }

  const hasAlert = scores.some((s) => s.rdDeficient);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
        BASIC Safety Scores
      </h3>
      {hasAlert && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          One or more BASICs exceed the intervention threshold
        </div>
      )}
      <div className="space-y-4">
        {scores.map((s) => {
          const color =
            s.percentile > 75
              ? "bg-rose-500"
              : s.percentile > 50
                ? "bg-amber-500"
                : "bg-emerald-500";
          return (
            <div key={s.code || s.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 font-medium">{s.name}</span>
                  {s.rdDeficient && (
                    <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
                      ALERT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{s.totalViolations} violations</span>
                  <span>{s.totalInspections} inspections</span>
                  {s.serious > 0 && (
                    <span className="text-rose-600">{s.serious} serious</span>
                  )}
                  <span className={`font-semibold ${s.rdDeficient ? "text-rose-600" : "text-gray-900"}`}>
                    {s.percentile}%
                  </span>
                </div>
              </div>
              <div className="relative h-3 overflow-visible rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full ${color} transition-all`}
                  style={{ width: `${Math.min(s.percentile, 100)}%` }}
                />
                {/* Intervention threshold marker */}
                <div
                  className="absolute top-0 h-full w-px border-l border-dashed border-gray-500"
                  style={{ left: "75%" }}
                  title="Intervention threshold (75th percentile)"
                />
              </div>
              {s.measureValue > 0 && (
                <p className="mt-0.5 text-[10px] text-gray-400">
                  Measure value: {s.measureValue.toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
        <span className="inline-block w-3 border-t border-dashed border-gray-500" />
        <span>FMCSA intervention threshold (75th percentile)</span>
      </div>
    </div>
  );
}

/* ── Violation Breakdown (derived from inspections) ───────────── */

function ViolationBreakdown({ inspections }: { inspections: SocrataInspection[] }) {
  if (inspections.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Violation Breakdown
        </h3>
        <p className="text-sm text-gray-400 tracking-wide">No inspection records found.</p>
      </div>
    );
  }

  // Derive violation breakdown from inspection category totals
  const categories: { name: string; total: number; oos: number }[] = [];

  const driverViols = inspections.reduce((s, i) => s + (parseInt(i.driver_viol_total ?? "0", 10) || 0), 0);
  const driverOos = inspections.reduce((s, i) => s + (parseInt(i.driver_oos_total ?? "0", 10) || 0), 0);
  const vehicleViols = inspections.reduce((s, i) => s + (parseInt(i.vehicle_viol_total ?? "0", 10) || 0), 0);
  const vehicleOos = inspections.reduce((s, i) => s + (parseInt(i.vehicle_oos_total ?? "0", 10) || 0), 0);
  const hazmatViols = inspections.reduce((s, i) => s + (parseInt(i.hazmat_viol_total ?? "0", 10) || 0), 0);
  const hazmatOos = inspections.reduce((s, i) => s + (parseInt(i.hazmat_oos_total ?? "0", 10) || 0), 0);
  const totalViols = inspections.reduce((s, i) => s + (parseInt(i.viol_total ?? "0", 10) || 0), 0);
  const totalOos = inspections.reduce((s, i) => s + (parseInt(i.oos_total ?? "0", 10) || 0), 0);

  if (driverViols > 0) categories.push({ name: "Driver", total: driverViols, oos: driverOos });
  if (vehicleViols > 0) categories.push({ name: "Vehicle", total: vehicleViols, oos: vehicleOos });
  if (hazmatViols > 0) categories.push({ name: "Hazmat", total: hazmatViols, oos: hazmatOos });

  // Account for "other" violations not in driver/vehicle/hazmat
  const categorizedViols = driverViols + vehicleViols + hazmatViols;
  const otherViols = totalViols - categorizedViols;
  if (otherViols > 0) {
    const categorizedOos = driverOos + vehicleOos + hazmatOos;
    categories.push({ name: "Other", total: otherViols, oos: Math.max(0, totalOos - categorizedOos) });
  }

  categories.sort((a, b) => b.total - a.total);
  const maxCount = categories[0]?.total ?? 1;
  const topCat = categories[0]?.name ?? "N/A";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Violation Breakdown
      </h3>
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="OOS Violations" value={totalOos} warn={totalOos > 0} />
        <Stat label="Top Category" value={topCat} />
      </div>
      {categories.length > 0 && (
        <div className="space-y-3">
          {categories.map(({ name, total, oos }) => (
            <div key={name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700">{name}</span>
                <div className="flex items-center gap-2 text-gray-500">
                  <span>{total} total</span>
                  {oos > 0 && <span className="text-rose-600">{oos} OOS</span>}
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="flex h-full">
                  <div
                    className="h-full rounded-l-full bg-indigo-500 transition-all"
                    style={{ width: `${((total - oos) / maxCount) * 100}%` }}
                  />
                  {oos > 0 && (
                    <div
                      className="h-full bg-rose-500 transition-all last:rounded-r-full"
                      style={{ width: `${(oos / maxCount) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Violation Trend Chart (d3) ───────────────────────────────── */

function ViolationTrendChart({ inspections }: { inspections: SocrataInspection[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute dynamic date range label
  const dates = inspections.filter((i) => i.insp_date).map((i) => new Date(i.insp_date!));
  const dateRangeLabel = dates.length > 0
    ? `${d3.timeFormat("%b %Y")(d3.min(dates)!)} \u2013 ${d3.timeFormat("%b %Y")(d3.max(dates)!)}`
    : "N/A";

  useEffect(() => {
    if (!svgRef.current || inspections.length === 0) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 700;
    const height = 280;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    // Parse dates and group by month
    const parsed = inspections
      .filter((i) => i.insp_date)
      .map((i) => ({
        date: new Date(i.insp_date!),
        violations: parseInt(i.viol_total ?? "0", 10) || 0,
        oos: parseInt(i.oos_total ?? "0", 10) || 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (parsed.length === 0) return;

    const grouped = d3.rollups(
      parsed,
      (v) => ({
        violations: d3.sum(v, (d) => d.violations),
        oos: d3.sum(v, (d) => d.oos),
      }),
      (d) => d3.timeMonth(d.date)
    ).map(([date, vals]) => ({ date, ...vals }));

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(grouped, (d) => d.date) as [Date, Date])
      .range([0, innerW]);

    const yMax = d3.max(grouped, (d) => Math.max(d.violations, d.oos)) ?? 1;
    const yScale = d3.scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

    // Clear and draw
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => "")
      )
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,2"));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => d3.timeFormat("%b '%y")(d as Date)))
      .call((sel) => sel.select(".domain").attr("stroke", "#d1d5db"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#d1d5db"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").remove());

    // Lines
    const violationLine = d3.line<typeof grouped[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.violations))
      .curve(d3.curveMonotoneX);

    const oosLine = d3.line<typeof grouped[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.oos))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(grouped)
      .attr("fill", "none")
      .attr("stroke", "#4f46e5")
      .attr("stroke-width", 2)
      .attr("d", violationLine);

    g.append("path")
      .datum(grouped)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 2)
      .attr("d", oosLine);

    // Dots
    g.selectAll(".dot-viol")
      .data(grouped)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.violations))
      .attr("r", 3)
      .attr("fill", "#4f46e5");

    g.selectAll(".dot-oos")
      .data(grouped)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.oos))
      .attr("r", 3)
      .attr("fill", "#ef4444");

    // Legend
    const legend = g.append("g").attr("transform", `translate(${innerW - 140}, -10)`);
    legend.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 4).attr("y2", 4).attr("stroke", "#4f46e5").attr("stroke-width", 2);
    legend.append("text").attr("x", 20).attr("y", 8).text("Violations").attr("fill", "#6b7280").attr("font-size", "10px");
    legend.append("line").attr("x1", 80).attr("x2", 96).attr("y1", 4).attr("y2", 4).attr("stroke", "#ef4444").attr("stroke-width", 2);
    legend.append("text").attr("x", 100).attr("y", 8).text("OOS").attr("fill", "#6b7280").attr("font-size", "10px");
  }, [inspections]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
        Violation Trend ({dateRangeLabel})
      </h3>
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minWidth: 400 }} />
      </div>
    </div>
  );
}

/* ── OOS Rate Trend Chart (d3) ────────────────────────────────── */

function OosRateTrendChart({ inspections }: { inspections: SocrataInspection[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || inspections.length === 0) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = 700;
    const height = 220;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const parsed = inspections
      .filter((i) => i.insp_date)
      .map((i) => ({
        date: new Date(i.insp_date!),
        oos: parseInt(i.oos_total ?? "0", 10) || 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (parsed.length === 0) return;

    const grouped = d3.rollups(
      parsed,
      (v) => ({
        total: v.length,
        oos: d3.sum(v, (d) => (d.oos > 0 ? 1 : 0)),
      }),
      (d) => d3.timeMonth(d.date)
    ).map(([date, vals]) => ({
      date,
      rate: vals.total > 0 ? (vals.oos / vals.total) * 100 : 0,
    }));

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(grouped, (d) => d.date) as [Date, Date])
      .range([0, innerW]);

    const yScale = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid
    g.append("g")
      .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ""))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,2"));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => d3.timeFormat("%b '%y")(d as Date)))
      .call((sel) => sel.select(".domain").attr("stroke", "#d1d5db"))
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").attr("stroke", "#d1d5db"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}%`))
      .call((sel) => sel.select(".domain").remove())
      .call((sel) => sel.selectAll(".tick text").attr("fill", "#6b7280").attr("font-size", "10px"))
      .call((sel) => sel.selectAll(".tick line").remove());

    // Line
    const line = d3.line<typeof grouped[0]>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.rate))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(grouped)
      .attr("fill", "none")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Dots
    g.selectAll(".dot-rate")
      .data(grouped)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.rate))
      .attr("r", 3)
      .attr("fill", "#f43f5e");
  }, [inspections]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-600" />
        OOS Rate Trend (Monthly %)
      </h3>
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minWidth: 400 }} />
      </div>
    </div>
  );
}
