"use client";

import { useRef, useEffect } from "react";
import * as d3 from "d3";
import type { SocrataInspection, SocrataViolation } from "@/lib/socrata";
import { Stat, parseBasics } from "../shared";
import type { BasicScore } from "../types";

export function SafetyTab({
  basics,
  violations,
  inspections,
}: {
  basics: unknown;
  violations: SocrataViolation[];
  inspections: SocrataInspection[];
}) {
  const scores = parseBasics(basics);

  return (
    <div className="space-y-6">
      {/* BASIC Score Gauges */}
      <BasicGauges scores={scores} basicsAvailable={basics !== null} />

      {/* Violation Breakdown */}
      <ViolationBreakdown violations={violations} />

      {/* Violation Trend Chart */}
      {inspections.length > 0 && <ViolationTrendChart inspections={inspections} />}
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
          BASIC Safety Scores
        </h3>
        <p className="text-sm text-slate-500 tracking-wide">
          Safety scores unavailable &mdash; FMCSA WEBKEY not configured
        </p>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
          BASIC Safety Scores
        </h3>
        <p className="text-sm text-slate-500 tracking-wide">
          No BASIC scores available for this carrier.
        </p>
      </div>
    );
  }

  const hasAlert = scores.some((s) => s.rdDeficient);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
        BASIC Safety Scores
      </h3>
      {hasAlert && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
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
                  <span className="text-slate-200 font-medium">{s.name}</span>
                  {s.rdDeficient && (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
                      ALERT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>{s.totalViolations} violations</span>
                  <span>{s.totalInspections} inspections</span>
                  <span className={`font-semibold ${s.rdDeficient ? "text-rose-400" : "text-slate-100"}`}>
                    {s.percentile}%
                  </span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${color} transition-all`}
                  style={{ width: `${Math.min(s.percentile, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Violation Breakdown ──────────────────────────────────────── */

function ViolationBreakdown({ violations }: { violations: SocrataViolation[] }) {
  if (violations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Violation Breakdown
        </h3>
        <p className="text-sm text-slate-500 tracking-wide">No violation records found.</p>
      </div>
    );
  }

  // Group by basic_code_desc
  const groups = new Map<string, { total: number; oos: number }>();
  for (const v of violations) {
    const cat = v.basic_code_desc || v.group_desc || "Other";
    const existing = groups.get(cat) || { total: 0, oos: 0 };
    existing.total += 1;
    if (v.oos_indicator === "Y") existing.oos += 1;
    groups.set(cat, existing);
  }

  const sorted = [...groups.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxCount = sorted[0]?.[1].total ?? 1;
  const totalOos = violations.filter((v) => v.oos_indicator === "Y").length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Violation Breakdown
      </h3>
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Violations" value={violations.length} />
        <Stat label="OOS Violations" value={totalOos} warn={totalOos > 0} />
        <Stat label="Top Category" value={sorted[0]?.[0] ?? "N/A"} />
      </div>
      <div className="space-y-3">
        {sorted.slice(0, 8).map(([cat, { total, oos }]) => (
          <div key={cat}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 truncate max-w-[60%]">{cat}</span>
              <div className="flex items-center gap-2 text-slate-400">
                <span>{total} total</span>
                {oos > 0 && <span className="text-rose-400">{oos} OOS</span>}
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="flex h-full">
                <div
                  className="h-full rounded-l-full bg-blue-500 transition-all"
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
    </div>
  );
}

/* ── Violation Trend Chart (d3) ───────────────────────────────── */

function ViolationTrendChart({ inspections }: { inspections: SocrataInspection[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

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
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke", "#1e293b").attr("stroke-dasharray", "2,2"));

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat((d) => d3.timeFormat("%b '%y")(d as Date)))
      .call((g) => g.select(".domain").attr("stroke", "#334155"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", "10px"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#334155"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#94a3b8").attr("font-size", "10px"))
      .call((g) => g.selectAll(".tick line").remove());

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
      .attr("stroke", "#3b82f6")
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
      .attr("fill", "#3b82f6");

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
    legend.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 4).attr("y2", 4).attr("stroke", "#3b82f6").attr("stroke-width", 2);
    legend.append("text").attr("x", 20).attr("y", 8).text("Violations").attr("fill", "#94a3b8").attr("font-size", "10px");
    legend.append("line").attr("x1", 80).attr("x2", 96).attr("y1", 4).attr("y2", 4).attr("stroke", "#ef4444").attr("stroke-width", 2);
    legend.append("text").attr("x", 100).attr("y", 8).text("OOS").attr("fill", "#94a3b8").attr("font-size", "10px");
  }, [inspections]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
        Violation Trend (24 months)
      </h3>
      <div className="w-full overflow-x-auto">
        <svg ref={svgRef} className="w-full" style={{ minWidth: 400 }} />
      </div>
    </div>
  );
}
