"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type { SocrataCrash } from "@/lib/socrata";

/* ── Constants ──────────────────────────────────────────────────────── */

const WIDTH = 760;
const HEIGHT = 460;

const projection = geoAlbersUsa().scale(900).translate([WIDTH / 2, HEIGHT / 2]);
const pathGen = geoPath().projection(projection);

type StateData = {
  state: string;
  total: number;
  fatalities: number;
  injuries: number;
  towAways: number;
};

const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [-86.79, 32.81], AK: [-152.40, 61.37], AZ: [-111.43, 33.73],
  AR: [-92.37, 34.97], CA: [-119.68, 36.12], CO: [-105.31, 39.06],
  CT: [-72.76, 41.60], DE: [-75.51, 39.32], FL: [-81.69, 27.77],
  GA: [-83.64, 33.04], HI: [-157.50, 21.09], ID: [-114.48, 44.24],
  IL: [-88.99, 40.35], IN: [-86.26, 39.85], IA: [-93.21, 42.01],
  KS: [-96.73, 38.53], KY: [-84.67, 37.67], LA: [-91.87, 31.17],
  ME: [-69.38, 44.69], MD: [-76.80, 39.06], MA: [-71.53, 42.23],
  MI: [-84.54, 43.33], MN: [-93.90, 45.69], MS: [-89.68, 32.74],
  MO: [-92.29, 38.46], MT: [-110.45, 46.92], NE: [-98.27, 41.13],
  NV: [-117.06, 38.31], NH: [-71.56, 43.45], NJ: [-74.52, 40.30],
  NM: [-106.25, 34.84], NY: [-74.95, 42.17], NC: [-79.81, 35.63],
  ND: [-99.78, 47.53], OH: [-82.76, 40.39], OK: [-96.93, 35.57],
  OR: [-122.07, 44.57], PA: [-77.21, 40.59], RI: [-71.51, 41.68],
  SC: [-80.95, 33.86], SD: [-99.44, 44.30], TN: [-86.69, 35.75],
  TX: [-97.56, 31.05], UT: [-111.86, 40.15], VT: [-72.71, 44.05],
  VA: [-78.17, 37.77], WA: [-121.49, 47.40], WV: [-80.95, 38.49],
  WI: [-89.62, 44.27], WY: [-107.30, 42.76], DC: [-77.03, 38.90],
};

const STATE_NAMES: Record<string, string> = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DE:"Delaware",FL:"Florida",GA:"Georgia",
  HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",
  KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",
  MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",
  NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",
  NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
  DC:"Washington D.C.",
};

const FIPS_TO_STATE: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY",
};

/* ── Component ──────────────────────────────────────────────────────── */

export default function CrashMapInner({ crashes }: { crashes: SocrataCrash[] }) {
  const [topoData, setTopoData] = useState<FeatureCollection | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; state: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    import("us-atlas/states-10m.json").then((us) => {
      const topo = us.default as unknown as Topology;
      const states = feature(topo, topo.objects.states as GeometryCollection) as FeatureCollection;
      setTopoData(states);
    });
  }, []);

  const stateMap = useMemo(() => {
    const map = new Map<string, StateData>();
    for (const cr of crashes) {
      const st = cr.report_state?.toUpperCase();
      if (!st) continue;
      const existing = map.get(st) ?? { state: st, total: 0, fatalities: 0, injuries: 0, towAways: 0 };
      existing.total += 1;
      existing.fatalities += parseInt(cr.fatalities ?? "0", 10) || 0;
      existing.injuries += parseInt(cr.injuries ?? "0", 10) || 0;
      existing.towAways += parseInt(cr.tow_away ?? "0", 10) || 0;
      map.set(st, existing);
    }
    return map;
  }, [crashes]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const d of stateMap.values()) if (d.total > m) m = d.total;
    return m;
  }, [stateMap]);

  const topStates = useMemo(
    () => [...stateMap.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    [stateMap],
  );

  function stateFill(abbr: string | undefined): string {
    if (!abbr) return "#f8f6f4";
    const data = stateMap.get(abbr);
    if (!data || data.total === 0 || maxCount === 0) return "#f8f6f4";
    const t = data.total / maxCount;
    // Red-tinted choropleth for crashes
    if (data.fatalities > 0) return `rgba(220,38,38,${0.12 + t * 0.3})`;
    if (t < 0.2) return "rgb(254,242,242)";
    if (t < 0.4) return "rgb(254,226,226)";
    if (t < 0.6) return "rgb(252,196,196)";
    return "rgb(248,164,164)";
  }

  function dotColor(data: StateData): string {
    if (data.fatalities > 0) return "#DC2626"; // rose-600
    if (data.injuries > 0) return "#D97706";   // amber-600
    return "#7C3AED";                           // violet-600
  }

  function dotRadius(count: number): number {
    if (maxCount === 0) return 5;
    return 5 + (count / maxCount) * 14;
  }

  function dotOpacity(count: number): number {
    if (maxCount === 0) return 0.6;
    return 0.55 + (count / maxCount) * 0.35;
  }

  const activeState = selectedState ?? hoveredState;
  const activeData = activeState ? stateMap.get(activeState) : null;

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="flex-1 relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto"
          style={{ maxHeight: 380, background: "var(--surface-1)", cursor: "default", overflow: "visible" }}
        >
          {topoData?.features.map((feat: Feature<Geometry>) => {
            const fips = String(feat.id);
            const abbr = FIPS_TO_STATE[fips];
            const isActive = activeState === abbr;
            const d = pathGen(feat);
            if (!d) return null;
            return (
              <path
                key={fips}
                d={d}
                fill={stateFill(abbr)}
                stroke="#fff"
                strokeWidth={isActive ? 1.5 : 0.75}
                className="transition-colors duration-100"
                onMouseEnter={() => setHoveredState(abbr ?? null)}
                onMouseLeave={() => setHoveredState(null)}
                onClick={() => setSelectedState(selectedState === abbr ? null : abbr ?? null)}
                style={{ cursor: "pointer" }}
              />
            );
          })}

          {Object.entries(STATE_CENTROIDS).map(([abbr, lonlat]) => {
            const data = stateMap.get(abbr);
            if (!data || data.total === 0) return null;
            const pos = projection(lonlat);
            if (!pos) return null;
            const [cx, cy] = pos;
            const r = dotRadius(data.total);
            const isActive = activeState === abbr;

            return (
              <g key={`dot-${abbr}`}>
                {isActive && (
                  <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={dotColor(data)} strokeWidth={1.5} opacity={0.5} />
                )}
                <circle
                  cx={cx} cy={cy} r={r}
                  fill={dotColor(data)}
                  fillOpacity={isActive ? 0.95 : dotOpacity(data.total)}
                  stroke="#fff"
                  strokeWidth={0.75}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    setHoveredState(abbr);
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, state: abbr });
                  }}
                  onMouseLeave={() => { setHoveredState(null); setTooltip(null); }}
                  onClick={() => setSelectedState(selectedState === abbr ? null : abbr)}
                />
                {r >= 10 && (
                  <text
                    x={cx} y={cy}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={r >= 14 ? 10 : 8} fontWeight={600} fill="#fff"
                    style={{ pointerEvents: "none", userSelect: "none", fontFamily: "var(--font-sans)" }}
                  >
                    {data.total}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {tooltip && stateMap.get(tooltip.state) && (() => {
          const d = stateMap.get(tooltip.state)!;
          return (
            <div
              className="absolute z-10 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 shadow-lg pointer-events-none text-xs"
              style={{ left: tooltip.x + 12, top: tooltip.y - 10, minWidth: 140 }}
            >
              <p className="font-semibold text-[var(--ink)]">{STATE_NAMES[d.state] ?? d.state}</p>
              <p className="text-[var(--ink-soft)] mt-0.5">{d.total} crash{d.total !== 1 ? "es" : ""}</p>
              <div className="flex gap-3 mt-0.5">
                {d.fatalities > 0 && <span className="text-rose-600 font-medium">{d.fatalities} fatal</span>}
                {d.injuries > 0 && <span className="text-amber-600">{d.injuries} injuries</span>}
                {d.towAways > 0 && <span className="text-violet-600">{d.towAways} tow-away</span>}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Sidebar */}
      <div className="lg:w-60 border-t lg:border-t-0 lg:border-l border-[var(--border)] px-4 py-3">
        {activeData ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{STATE_NAMES[activeData.state] ?? activeData.state}</p>
              <p className="text-[10px] text-[var(--ink-muted)]">{activeData.total} crash{activeData.total !== 1 ? "es" : ""}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-rose-50 px-2 py-2 text-center ring-1 ring-rose-200">
                <p className="text-base font-bold text-rose-700">{activeData.fatalities}</p>
                <p className="text-[9px] text-rose-500">Fatal</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2 text-center ring-1 ring-amber-200">
                <p className="text-base font-bold text-amber-700">{activeData.injuries}</p>
                <p className="text-[9px] text-amber-500">Injuries</p>
              </div>
              <div className="rounded-lg bg-violet-50 px-2 py-2 text-center ring-1 ring-violet-200">
                <p className="text-base font-bold text-violet-700">{activeData.towAways}</p>
                <p className="text-[9px] text-violet-500">Tow-away</p>
              </div>
            </div>
            <button onClick={() => setSelectedState(null)} className="text-[10px] text-accent hover:text-accent-hover">
              Back to overview
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">Top States</p>
            {topStates.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">No crash data</p>
            ) : (
              <div className="space-y-1">
                {topStates.map((sd) => (
                  <button
                    key={sd.state}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                    onMouseEnter={() => setHoveredState(sd.state)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(selectedState === sd.state ? null : sd.state)}
                  >
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor(sd) }} />
                    <span className="text-xs font-medium text-[var(--ink)] w-6">{sd.state}</span>
                    <div className="flex-1 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${(sd.total / maxCount) * 100}%`, backgroundColor: dotColor(sd), opacity: 0.6 }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--ink-muted)] w-5 text-right">{sd.total}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
