"use client";

import { useState, useMemo } from "react";

/* ── Types ──────────────────────────────────────────────────────────── */

type StateData = {
  state: string;
  total: number;
  vehicleViols: number;
  driverViols: number;
  oos: number;
};

/* ── Truck & Trailer SVG Icons ──────────────────────────────────────── */

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 4v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function TrailerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="18" height="13" rx="1" />
      <path d="M19 10h4" />
      <circle cx="7" cy="18.5" r="2.5" />
      <circle cx="14" cy="18.5" r="2.5" />
      <path d="M1 10h18" />
    </svg>
  );
}

/* ── US State Paths (simplified for lightweight rendering) ──────────── */
/* viewBox: 0 0 960 600 — standard US Albers projection bounds */

const STATE_PATHS: Record<string, string> = {
  AL: "M628,425 L628,467 L619,491 L635,493 L637,478 L651,467 L651,425Z",
  AK: "M161,485 L183,485 L183,510 L210,510 L210,530 L161,530Z",
  AZ: "M205,410 L275,410 L275,500 L210,500 L195,475 L195,440Z",
  AR: "M555,420 L620,420 L620,468 L555,468Z",
  CA: "M108,280 L145,280 L165,310 L180,370 L180,475 L135,475 L100,420 L85,350Z",
  CO: "M290,305 L385,305 L385,370 L290,370Z",
  CT: "M850,195 L880,185 L885,205 L855,215Z",
  DE: "M815,280 L830,270 L835,295 L820,300Z",
  FL: "M660,470 L720,455 L760,485 L740,535 L695,555 L670,520 L655,490Z",
  GA: "M660,415 L710,415 L715,455 L695,485 L660,485 L650,465Z",
  HI: "M260,515 L300,510 L305,530 L270,535Z",
  ID: "M215,145 L260,145 L270,240 L235,275 L210,275 L205,200Z",
  IL: "M575,260 L610,255 L615,335 L605,370 L575,370 L565,330Z",
  IN: "M615,260 L650,260 L650,355 L615,365Z",
  IA: "M510,235 L580,230 L585,280 L505,285Z",
  KS: "M405,330 L510,330 L510,390 L405,390Z",
  KY: "M615,355 L720,340 L725,375 L620,390Z",
  LA: "M555,468 L610,468 L615,520 L580,535 L555,505Z",
  ME: "M880,95 L905,85 L915,130 L890,155 L870,140Z",
  MD: "M770,280 L830,265 L840,290 L805,310 L775,305Z",
  MA: "M855,180 L900,170 L905,185 L860,195Z",
  MI: "M595,145 L640,130 L665,175 L660,240 L615,250 L600,200Z",
  MN: "M470,120 L545,115 L550,210 L475,215Z",
  MS: "M590,420 L620,420 L620,500 L605,510 L590,490Z",
  MO: "M510,310 L575,305 L580,390 L540,410 L510,395Z",
  MT: "M245,105 L380,100 L385,175 L250,180Z",
  NE: "M370,265 L480,260 L485,310 L370,315Z",
  NV: "M170,220 L220,215 L235,340 L185,380 L155,310Z",
  NH: "M865,120 L880,115 L885,170 L865,175Z",
  NJ: "M825,225 L845,220 L840,270 L820,275Z",
  NM: "M270,400 L355,400 L355,495 L270,500Z",
  NY: "M780,155 L845,140 L860,195 L835,220 L790,230 L775,200Z",
  NC: "M690,365 L800,340 L810,370 L720,395 L690,390Z",
  ND: "M385,115 L470,110 L475,180 L390,185Z",
  OH: "M650,250 L710,240 L720,310 L660,325 L645,300Z",
  OK: "M390,390 L510,385 L520,420 L510,435 L405,440 L395,415Z",
  OR: "M100,140 L200,130 L215,195 L110,210Z",
  PA: "M730,220 L810,210 L825,250 L740,265Z",
  RI: "M875,195 L890,190 L892,205 L877,208Z",
  SC: "M700,395 L755,375 L770,405 L730,425 L700,420Z",
  SD: "M385,185 L475,180 L480,250 L390,255Z",
  TN: "M610,375 L725,360 L730,395 L615,410Z",
  TX: "M355,430 L505,430 L520,440 L535,510 L510,555 L440,570 L380,540 L340,500Z",
  UT: "M230,260 L295,255 L300,360 L240,365Z",
  VT: "M845,115 L865,110 L868,170 L848,175Z",
  VA: "M700,310 L800,290 L810,335 L730,360 L690,355Z",
  WA: "M115,80 L215,75 L220,140 L120,145Z",
  WV: "M710,290 L745,280 L745,345 L715,355 L700,325Z",
  WI: "M530,140 L590,135 L600,220 L535,225Z",
  WY: "M280,195 L375,190 L380,265 L285,270Z",
  DC: "M795,295 L805,290 L808,300 L798,303Z",
};

const STATE_LABELS: Record<string, [number, number]> = {
  AL: [640,450], AK: [185,505], AZ: [235,455], AR: [585,445], CA: [135,380],
  CO: [338,338], CT: [866,200], DE: [828,285], FL: [700,500], GA: [685,445],
  HI: [280,522], ID: [230,210], IL: [590,310], IN: [633,305], IA: [543,258],
  KS: [458,360], KY: [668,368], LA: [580,490], ME: [893,115], MD: [805,290],
  MA: [878,178], MI: [630,185], MN: [508,165], MS: [605,460], MO: [545,355],
  MT: [315,140], NE: [425,288], NV: [185,290], NH: [875,145], NJ: [833,248],
  NM: [313,448], NY: [810,185], NC: [745,370], ND: [428,148], OH: [680,280],
  OK: [448,415], OR: [155,170], PA: [775,240], RI: [883,200], SC: [730,405],
  SD: [433,218], TN: [668,388], TX: [440,498], UT: [265,310], VT: [855,140],
  VA: [750,325], WA: [168,108], WV: [725,318], WI: [560,178], WY: [328,228],
  DC: [800,298],
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

/* ── Color scale ────────────────────────────────────────────────────── */

function heatColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--surface-2)";
  const t = Math.min(count / max, 1);
  // Warm gradient: surface → light orange → accent → deep orange
  if (t < 0.25) return `rgba(217,119,87,${0.12 + t * 1.2})`;
  if (t < 0.5) return `rgba(217,119,87,${0.25 + t * 0.8})`;
  if (t < 0.75) return `rgba(196,98,63,${0.5 + t * 0.4})`;
  return `rgba(180,70,40,${0.7 + t * 0.3})`;
}

function textColorForHeat(count: number, max: number): string {
  if (count === 0 || max === 0) return "var(--ink-muted)";
  const t = Math.min(count / max, 1);
  return t > 0.4 ? "#fff" : "var(--ink)";
}

/* ── Component ──────────────────────────────────────────────────────── */

type InspectionLike = {
  report_state?: string;
  vehicle_viol_total?: string;
  driver_viol_total?: string;
  oos_total?: string;
};

export function InspectionHeatmap({ inspections }: { inspections: InspectionLike[] }) {
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const stateMap = useMemo(() => {
    const map = new Map<string, StateData>();
    for (const insp of inspections) {
      const st = insp.report_state?.toUpperCase();
      if (!st) continue;
      const existing = map.get(st) ?? { state: st, total: 0, vehicleViols: 0, driverViols: 0, oos: 0 };
      existing.total += 1;
      existing.vehicleViols += parseInt(insp.vehicle_viol_total ?? "0", 10) || 0;
      existing.driverViols += parseInt(insp.driver_viol_total ?? "0", 10) || 0;
      existing.oos += parseInt(insp.oos_total ?? "0", 10) || 0;
      map.set(st, existing);
    }
    return map;
  }, [inspections]);

  const maxCount = useMemo(() => {
    let m = 0;
    for (const d of stateMap.values()) {
      if (d.total > m) m = d.total;
    }
    return m;
  }, [stateMap]);

  // Top states for the bar breakdown
  const topStates = useMemo(() => {
    return [...stateMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [stateMap]);

  const activeState = selectedState ?? hoveredState;
  const activeData = activeState ? stateMap.get(activeState) : null;

  if (inspections.length === 0) return null;

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
          Inspection Heatmap
        </p>
        {activeData && (
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-[var(--ink)]">
              {STATE_NAMES[activeData.state] ?? activeData.state}
            </span>
            <span className="text-[var(--ink-soft)]">{activeData.total} inspection{activeData.total !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Map */}
        <div className="flex-1 px-2 pb-2">
          <svg
            viewBox="60 60 870 520"
            className="w-full h-auto"
            style={{ maxHeight: 340 }}
          >
            {Object.entries(STATE_PATHS).map(([abbr, path]) => {
              const data = stateMap.get(abbr);
              const count = data?.total ?? 0;
              const isActive = activeState === abbr;
              return (
                <g key={abbr}>
                  <path
                    d={path}
                    fill={heatColor(count, maxCount)}
                    stroke={isActive ? "var(--accent)" : "var(--border)"}
                    strokeWidth={isActive ? 2.5 : 0.8}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredState(abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(selectedState === abbr ? null : abbr)}
                  />
                  {/* State label */}
                  {STATE_LABELS[abbr] && (
                    <text
                      x={STATE_LABELS[abbr][0]}
                      y={STATE_LABELS[abbr][1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={count > 0 ? 11 : 9}
                      fontWeight={count > 0 ? 600 : 400}
                      fill={textColorForHeat(count, maxCount)}
                      className="pointer-events-none select-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {abbr}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar: state detail or top states */}
        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-[var(--border)] px-4 py-3">
          {activeData ? (
            /* Selected/hovered state detail */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {STATE_NAMES[activeData.state] ?? activeData.state}
                </span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                  {activeData.total} inspection{activeData.total !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Truck vs Trailer breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-center">
                  <TruckIcon className="mx-auto h-6 w-6 text-accent mb-1" />
                  <p className="text-lg font-semibold text-[var(--ink)]">{activeData.vehicleViols}</p>
                  <p className="text-[10px] text-[var(--ink-muted)]">Vehicle Viols</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-center">
                  <TrailerIcon className="mx-auto h-6 w-6 text-[var(--ink-soft)] mb-1" />
                  <p className="text-lg font-semibold text-[var(--ink)]">{activeData.driverViols}</p>
                  <p className="text-[10px] text-[var(--ink-muted)]">Driver Viols</p>
                </div>
              </div>

              {/* OOS indicator */}
              {activeData.oos > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-rose-200">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M8 5v3M8 10.5v.5" />
                  </svg>
                  <span className="text-xs font-medium text-rose-700">
                    {activeData.oos} out-of-service
                  </span>
                </div>
              )}

              {/* Rate bar */}
              <div>
                <div className="flex justify-between text-[10px] text-[var(--ink-muted)] mb-1">
                  <span>OOS Rate</span>
                  <span>
                    {activeData.total > 0
                      ? `${((activeData.oos / activeData.total) * 100).toFixed(1)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${activeData.total > 0 ? Math.min(100, (activeData.oos / activeData.total) * 100) : 0}%`,
                      background: activeData.oos > 0 ? "#e11d48" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Top states list */
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                Top States
              </p>
              {topStates.length === 0 ? (
                <p className="text-xs text-[var(--ink-muted)]">No state data</p>
              ) : (
                <div className="space-y-1.5">
                  {topStates.map((sd) => (
                    <button
                      key={sd.state}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                      onMouseEnter={() => setHoveredState(sd.state)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState(selectedState === sd.state ? null : sd.state)}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {sd.vehicleViols > sd.driverViols ? (
                          <TruckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                        ) : (
                          <TrailerIcon className="h-3.5 w-3.5 shrink-0 text-[var(--ink-soft)]" />
                        )}
                        <span className="text-xs font-medium text-[var(--ink)]">{sd.state}</span>
                        <span className="text-[10px] text-[var(--ink-muted)] truncate">
                          {STATE_NAMES[sd.state]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-accent-soft0"
                            style={{ width: `${(sd.total / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--ink-soft)] w-5 text-right">
                          {sd.total}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-3 px-4 py-2 border-t border-[var(--border)]">
        <span className="text-[10px] text-[var(--ink-muted)]">Fewer</span>
        <div className="flex h-2 flex-1 max-w-[200px] rounded-full overflow-hidden">
          {[0.05, 0.15, 0.3, 0.5, 0.7, 0.9].map((t, i) => (
            <div
              key={i}
              className="flex-1"
              style={{ background: `rgba(217,119,87,${0.1 + t * 0.85})` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[var(--ink-muted)]">More</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)]">
            <TruckIcon className="h-3 w-3" /> Vehicle
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--ink-muted)]">
            <TrailerIcon className="h-3 w-3" /> Driver
          </span>
        </div>
      </div>
    </div>
  );
}
