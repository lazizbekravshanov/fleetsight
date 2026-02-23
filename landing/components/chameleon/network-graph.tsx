"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

type GraphNode = {
  id: number;
  label: string;
  riskScore: number;
  priorRevoke: boolean;
  statusCode: string | null;
  isFocus: boolean;
};

type GraphEdge = {
  source: number;
  target: number;
  score: number;
  reasons: { feature: string; value: string; contribution: number }[];
};

type SimNode = d3.SimulationNodeDatum & GraphNode;
type SimLink = d3.SimulationLinkDatum<SimNode> & { score: number; reasons: GraphEdge["reasons"] };

function nodeColor(node: GraphNode): string {
  if (node.riskScore >= 70) return "#f43f5e";
  if (node.riskScore >= 30) return "#f59e0b";
  return "#10b981";
}

export function NetworkGraph({
  dotNumber,
  onSelectDot,
}: {
  dotNumber: number;
  onSelectDot: (dot: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/chameleon/network/${dotNumber}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load network");
        return r.json();
      })
      .then((data: { nodes: GraphNode[]; edges: GraphEdge[] }) => {
        renderGraph(data.nodes, data.edges);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [dotNumber]);

  function renderGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current?.clientWidth || 600;
    const height = 380;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Defs for glow effect
    const defs = svg.append("defs");
    const filter = defs.append("filter").attr("id", "node-glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    filter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .join("feMergeNode")
      .attr("in", (d) => d);

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const nodeById = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimLink[] = edges
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
      .map((e) => ({
        source: nodeById.get(e.source)!,
        target: nodeById.get(e.target)!,
        score: e.score,
        reasons: e.reasons,
      }));

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance((d) => Math.max(60, 200 - d.score))
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(25));

    // Edges
    const link = svg
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "rgba(148,163,184,0.12)")
      .attr("stroke-width", (d) => Math.max(1, d.score / 25))
      .attr("stroke-opacity", 0.8);

    // Edge labels
    const linkLabel = svg
      .append("g")
      .selectAll("text")
      .data(simLinks)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "8")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "rgba(148,163,184,0.25)")
      .text((d) => d.score.toFixed(0));

    // Nodes
    const node = svg
      .append("g")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_e, d) => onSelectDot(d.id))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Node outer glow (focus only)
    node
      .filter((d) => d.isFocus)
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => nodeColor(d))
      .attr("opacity", 0.08)
      .attr("filter", "url(#node-glow)");

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => (d.isFocus ? 12 : 8))
      .attr("fill", (d) => nodeColor(d))
      .attr("stroke", (d) => (d.isFocus ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.06)"))
      .attr("stroke-width", (d) => (d.isFocus ? 2 : 1))
      .attr("opacity", (d) => (d.isFocus ? 1 : 0.85))
      .style("transition", "r 0.2s ease");

    // Prior revoke indicator
    node
      .filter((d) => d.priorRevoke)
      .append("circle")
      .attr("r", 3.5)
      .attr("cx", (d) => (d.isFocus ? 10 : 6))
      .attr("cy", (d) => (d.isFocus ? -10 : -6))
      .attr("fill", "#f43f5e")
      .attr("stroke", "#0c1018")
      .attr("stroke-width", 1.5);

    // Labels
    node
      .append("text")
      .attr("dy", (d) => (d.isFocus ? 26 : 20))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.isFocus ? "10" : "8"))
      .attr("font-family", "var(--font-sans)")
      .attr("fill", (d) => (d.isFocus ? "rgba(226,232,240,0.9)" : "rgba(148,163,184,0.6)"))
      .attr("font-weight", (d) => (d.isFocus ? "500" : "400"))
      .text((d) => {
        const name = d.label;
        return name.length > 18 ? name.slice(0, 16) + "\u2026" : name;
      });

    // Tooltip
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .style("display", "none");

    const tooltipBg = tooltip
      .append("rect")
      .attr("fill", "rgba(15,23,42,0.95)")
      .attr("stroke", "rgba(148,163,184,0.1)")
      .attr("rx", 6);

    const tooltipText = tooltip.append("text").attr("fill", "#e2e8f0").attr("font-size", "10").attr("font-family", "var(--font-sans)");

    node
      .on("mouseenter", (_e, d) => {
        const lines = [
          d.label,
          `DOT: ${d.id}`,
          `Risk: ${d.riskScore.toFixed(0)}`,
          d.statusCode ? `Status: ${d.statusCode}` : "",
        ].filter(Boolean);

        tooltipText.selectAll("tspan").remove();
        lines.forEach((line, i) => {
          tooltipText
            .append("tspan")
            .attr("x", 10)
            .attr("dy", i === 0 ? 16 : 14)
            .text(line);
        });

        const bbox = tooltipText.node()?.getBBox();
        if (bbox) {
          tooltipBg
            .attr("width", bbox.width + 20)
            .attr("height", bbox.height + 12);
        }

        tooltip
          .attr("transform", `translate(${(d.x || 0) + 16}, ${(d.y || 0) - 24})`)
          .style("display", "block");
      })
      .on("mouseleave", () => {
        tooltip.style("display", "none");
      });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x || 0)
        .attr("y1", (d) => (d.source as SimNode).y || 0)
        .attr("x2", (d) => (d.target as SimNode).x || 0)
        .attr("y2", (d) => (d.target as SimNode).y || 0);

      linkLabel
        .attr(
          "x",
          (d) => (((d.source as SimNode).x || 0) + ((d.target as SimNode).x || 0)) / 2
        )
        .attr(
          "y",
          (d) => (((d.source as SimNode).y || 0) + ((d.target as SimNode).y || 0)) / 2
        );

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => simulation.stop();
  }

  // Loading
  if (loading) {
    return (
      <div className="card-elevated flex h-[380px] items-center justify-center rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
          <span className="text-sm text-slate-500">Loading network graph...</span>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7 4.5v3M7 9v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-400">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="3" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
            <circle cx="11" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1" />
            <circle cx="7" cy="12" r="1.5" stroke="currentColor" strokeWidth="1" />
            <path d="M4.2 4.8L5.5 5.8M9.8 4.8L8.5 5.8M7 9v1.5" stroke="currentColor" strokeWidth="0.8" />
          </svg>
          <h3 className="text-[13px] font-semibold text-white">Network Graph</h3>
        </div>
        <div className="flex gap-4 text-[10px] font-medium text-slate-500">
          {[
            { color: "bg-emerald-500", label: "Low" },
            { color: "bg-amber-500", label: "Med" },
            { color: "bg-rose-500", label: "High" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${item.color}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
      <svg ref={svgRef} className="h-[380px] w-full rounded-xl" />
    </div>
  );
}
