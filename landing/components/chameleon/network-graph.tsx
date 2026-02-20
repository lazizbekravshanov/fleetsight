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
    const height = 400;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Build simulation data
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
      .attr("stroke", "#475569")
      .attr("stroke-width", (d) => Math.max(1, d.score / 30))
      .attr("stroke-opacity", 0.6);

    // Edge labels (score)
    const linkLabel = svg
      .append("g")
      .selectAll("text")
      .data(simLinks)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "9")
      .attr("fill", "#64748b")
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

    // Node circles
    node
      .append("circle")
      .attr("r", (d) => (d.isFocus ? 14 : 10))
      .attr("fill", (d) => nodeColor(d))
      .attr("stroke", (d) => (d.isFocus ? "#fff" : "none"))
      .attr("stroke-width", (d) => (d.isFocus ? 2 : 0))
      .attr("opacity", 0.9);

    // Prior revoke indicator
    node
      .filter((d) => d.priorRevoke)
      .append("circle")
      .attr("r", 4)
      .attr("cx", 8)
      .attr("cy", -8)
      .attr("fill", "#f43f5e");

    // Labels
    node
      .append("text")
      .attr("dy", (d) => (d.isFocus ? 28 : 24))
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => (d.isFocus ? "11" : "9"))
      .attr("fill", "#cbd5e1")
      .text((d) => {
        const name = d.label;
        return name.length > 20 ? name.slice(0, 18) + "..." : name;
      });

    // Tooltip
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .style("display", "none");

    const tooltipBg = tooltip
      .append("rect")
      .attr("fill", "#1e293b")
      .attr("stroke", "#475569")
      .attr("rx", 4);

    const tooltipText = tooltip.append("text").attr("fill", "#e2e8f0").attr("font-size", "10");

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
            .attr("x", 8)
            .attr("dy", i === 0 ? 14 : 13)
            .text(line);
        });

        const bbox = tooltipText.node()?.getBBox();
        if (bbox) {
          tooltipBg
            .attr("width", bbox.width + 16)
            .attr("height", bbox.height + 10);
        }

        tooltip
          .attr("transform", `translate(${(d.x || 0) + 16}, ${(d.y || 0) - 20})`)
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

      tooltip.each(function () {
        // Keep tooltip near the hovered node — handled by mouseenter
      });
    });

    return () => simulation.stop();
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-slate-300">
        Loading network graph...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Network Graph</h3>
        <div className="flex gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Low
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
            High
          </span>
        </div>
      </div>
      <svg ref={svgRef} className="h-[400px] w-full" />
    </div>
  );
}
