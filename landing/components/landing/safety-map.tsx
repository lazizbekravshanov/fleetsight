"use client";

import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoPath } from "d3";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";

type Metrics = { inspections: number; crashes: number; fatalities: number };
type MetricKey = keyof Metrics;
type MapData = { states: Record<string, Metrics>; max: Metrics };

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "inspections", label: "Inspections", color: "#c2410c" },
  { key: "crashes", label: "Crashes", color: "#b91c1c" },
  { key: "fatalities", label: "Fatalities", color: "#7f1d1d" },
];

// us-atlas state features carry a 2-digit FIPS id; our data is keyed by USPS code.
const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT",
  "10": "DE", "11": "DC", "12": "FL", "13": "GA", "15": "HI", "16": "ID", "17": "IL",
  "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME", "24": "MD",
  "25": "MA", "26": "MI", "27": "MN", "28": "MS", "29": "MO", "30": "MT", "31": "NE",
  "32": "NV", "33": "NH", "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
  "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD",
  "47": "TN", "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

function mix(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const ca = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const cb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = ca.map((x, i) => Math.round(x + (cb[i] - x) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

const W = 960;
const H = 600;

export default function SafetyMap() {
  const [data, setData] = useState<MapData | null>(null);
  const [metric, setMetric] = useState<MetricKey>("inspections");
  const [hover, setHover] = useState<{ abbr: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stats/state-map")
      .then((r) => r.json())
      .then((d) => active && setData(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const { features, pathFor } = useMemo(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const topo = statesTopo as any;
    const fc = feature(topo, topo.objects.states) as any;
    const projection = geoAlbersUsa().fitSize([W, H], fc);
    const path = geoPath(projection);
    return { features: fc.features as any[], pathFor: (f: any) => path(f) as string | null };
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  const active = METRICS.find((m) => m.key === metric)!;
  const max = data?.max?.[metric] ?? 0;

  const fillFor = (v: number) => {
    if (!max || v <= 0) return "var(--surface-2)";
    return mix("#f6ecdc", active.color, Math.sqrt(v / max)); // sqrt spreads skewed counts
  };

  const hovered = hover && data ? data.states[hover.abbr] : null;

  return (
    <div className="rounded-2xl border p-4 sm:p-6" style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>National safety map</h3>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>Live FMCSA roadside inspections, crashes, and fatalities by state.</p>
        </div>
        <div className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={
                metric === m.key
                  ? { background: m.color, color: "white" }
                  : { background: "var(--surface-2)", color: "var(--ink-soft)" }
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`US map of FMCSA ${active.label.toLowerCase()} by state`}>
          {features.map((f) => {
            const d = pathFor(f);
            if (!d) return null;
            const abbr = FIPS_TO_USPS[String(f.id).padStart(2, "0")];
            const v = abbr && data ? data.states[abbr]?.[metric] ?? 0 : 0;
            return (
              <path
                key={String(f.id)}
                d={d}
                fill={fillFor(v)}
                stroke="var(--surface-1)"
                strokeWidth={0.75}
                onMouseMove={(e) =>
                  abbr && setHover({ abbr, x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>

        {hover && hovered && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border px-3 py-2 text-xs shadow-sm"
            style={{
              left: Math.min(hover.x + 12, W - 160),
              top: hover.y + 12,
              borderColor: "var(--border)",
              background: "var(--surface-1)",
              color: "var(--ink)",
            }}
          >
            <div className="mb-1 font-semibold">{hover.abbr}</div>
            <div className="tabular-nums" style={{ color: "var(--ink-soft)" }}>
              {hovered.inspections.toLocaleString()} inspections<br />
              {hovered.crashes.toLocaleString()} crashes<br />
              {hovered.fatalities.toLocaleString()} fatalities
            </div>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px]" style={{ color: "var(--ink-muted)" }}>
        Source: FMCSA / DOT public datasets (Socrata). Hover a state for detail.
      </p>
    </div>
  );
}
