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

type InspectionLike = {
  report_state?: string;
  vehicle_viol_total?: string;
  driver_viol_total?: string;
  oos_total?: string;
};

/* ── US State paths (Albers USA projection, viewBox 0 0 960 600) ──── */
/* Source: Natural Earth → TopoJSON US Atlas (standard D3 projection) */

const US_STATES: Record<string, { path: string; cx: number; cy: number }> = {
  AL: { cx: 632, cy: 434, path: "M616,396L617,444L614,458L618,462L631,457L638,462L638,400L631,396Z" },
  AK: { cx: 170, cy: 503, path: "M120,480L130,470L155,465L175,480L190,478L205,490L205,515L185,530L160,525L130,530L115,515L110,500Z" },
  AZ: { cx: 217, cy: 445, path: "M183,395L269,381L282,463L263,495L199,503L185,470L177,415Z" },
  AR: { cx: 567, cy: 430, path: "M547,405L594,400L604,406L605,450L595,461L545,463L543,410Z" },
  CA: { cx: 122, cy: 375, path: "M96,290L123,264L132,281L149,306L165,345L170,400L165,450L152,468L120,445L100,405L86,345Z" },
  CO: { cx: 310, cy: 340, path: "M260,310L372,299L377,367L264,378Z" },
  CT: { cx: 860, cy: 199, path: "M844,189L870,182L874,199L857,207L844,202Z" },
  DE: { cx: 828, cy: 289, path: "M820,272L834,265L838,290L828,300L820,285Z" },
  FL: { cx: 700, cy: 506, path: "M644,469L697,453L730,460L743,479L735,510L710,538L690,545L672,530L652,490L644,478Z" },
  GA: { cx: 670, cy: 435, path: "M641,396L697,389L707,435L700,462L670,470L644,470L638,450L638,400Z" },
  HI: { cx: 305, cy: 530, path: "M270,515L295,508L310,515L315,530L295,540L275,535Z" },
  ID: { cx: 210, cy: 205, path: "M193,132L224,118L244,140L255,195L250,255L228,270L205,265L195,215L188,165Z" },
  IL: { cx: 586, cy: 320, path: "M568,261L600,256L606,285L610,330L601,357L591,367L576,359L568,325L564,280Z" },
  IN: { cx: 625, cy: 310, path: "M608,261L640,257L644,340L637,357L608,360L606,285Z" },
  IA: { cx: 530, cy: 262, path: "M505,237L575,232L580,266L578,280L510,284L503,255Z" },
  KS: { cx: 440, cy: 365, path: "M393,340L520,333L522,390L393,396Z" },
  KY: { cx: 660, cy: 365, path: "M614,352L711,335L718,360L700,375L614,387L608,362Z" },
  LA: { cx: 571, cy: 487, path: "M543,460L594,458L605,475L600,510L580,522L563,508L543,500L538,470Z" },
  ME: { cx: 893, cy: 120, path: "M874,97L893,82L905,100L907,135L895,150L878,140L870,115Z" },
  MD: { cx: 800, cy: 295, path: "M764,280L823,268L835,285L818,303L795,310L775,300L764,295Z" },
  MA: { cx: 872, cy: 182, path: "M844,175L877,168L890,178L875,190L844,190Z" },
  MI: { cx: 628, cy: 195, path: "M580,155L610,140L640,145L656,175L652,215L640,245L615,250L600,230L586,195Z" },
  MN: { cx: 505, cy: 165, path: "M478,118L545,110L553,130L555,215L483,220L475,175Z" },
  MS: { cx: 600, cy: 455, path: "M594,400L618,396L618,462L612,485L600,498L590,480L585,460L590,410Z" },
  MO: { cx: 545, cy: 365, path: "M520,310L580,304L590,340L588,375L575,393L545,405L525,395L518,365L520,332Z" },
  MT: { cx: 286, cy: 136, path: "M210,110L378,96L382,172L215,180L205,145Z" },
  NE: { cx: 420, cy: 290, path: "M365,265L500,258L505,285L505,310L370,318L362,285Z" },
  NV: { cx: 165, cy: 310, path: "M148,230L208,216L230,305L205,372L155,340L132,285Z" },
  NH: { cx: 875, cy: 145, path: "M864,115L878,108L882,162L868,172L862,140Z" },
  NJ: { cx: 836, cy: 250, path: "M823,222L840,215L843,255L835,270L822,268L820,240Z" },
  NM: { cx: 275, cy: 445, path: "M230,390L320,382L325,485L235,492L225,425Z" },
  NY: { cx: 815, cy: 190, path: "M773,162L840,150L858,175L850,202L835,218L803,225L780,215L770,190Z" },
  NC: { cx: 730, cy: 375, path: "M687,355L790,330L808,345L795,370L725,390L690,388Z" },
  ND: { cx: 430, cy: 142, path: "M380,112L478,106L483,175L385,180Z" },
  OH: { cx: 670, cy: 290, path: "M640,250L704,240L715,290L706,325L650,338L640,310Z" },
  OK: { cx: 450, cy: 415, path: "M373,390L395,378L520,375L530,397L520,420L510,435L395,440L373,425Z" },
  OR: { cx: 145, cy: 170, path: "M86,130L192,118L205,145L210,190L115,200L90,178Z" },
  PA: { cx: 790, cy: 240, path: "M740,215L822,205L835,218L830,252L745,264L735,235Z" },
  RI: { cx: 878, cy: 200, path: "M872,192L882,188L884,202L874,206Z" },
  SC: { cx: 720, cy: 405, path: "M690,388L748,368L765,390L742,418L710,425L695,415Z" },
  SD: { cx: 430, cy: 215, path: "M380,180L478,175L483,220L503,248L505,255L380,262Z" },
  TN: { cx: 656, cy: 388, path: "M605,370L710,355L718,374L700,390L610,400L601,385Z" },
  TX: { cx: 430, cy: 490, path: "M335,430L395,440L510,435L535,470L540,520L510,560L460,575L410,555L365,530L330,490L325,455Z" },
  UT: { cx: 230, cy: 325, path: "M183,265L260,255L268,378L190,390L178,345Z" },
  VT: { cx: 860, cy: 135, path: "M852,110L864,105L868,168L854,175L848,142Z" },
  VA: { cx: 755, cy: 330, path: "M700,305L800,282L812,320L790,340L710,358L695,345Z" },
  WA: { cx: 150, cy: 100, path: "M100,68L200,60L210,110L200,135L118,142L92,118Z" },
  WV: { cx: 730, cy: 315, path: "M706,286L740,275L748,315L735,345L712,355L698,330Z" },
  WI: { cx: 560, cy: 185, path: "M535,138L580,128L600,155L598,215L565,230L540,222L530,180Z" },
  WY: { cx: 290, cy: 240, path: "M240,200L370,192L375,265L245,272Z" },
  DC: { cx: 806, cy: 298, path: "M800,293L808,289L811,298L803,302Z" },
};

/* ── Component ──────────────────────────────────────────────────────── */

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
    for (const d of stateMap.values()) if (d.total > m) m = d.total;
    return m;
  }, [stateMap]);

  const topStates = useMemo(
    () => [...stateMap.values()].sort((a, b) => b.total - a.total).slice(0, 8),
    [stateMap],
  );

  const activeState = selectedState ?? hoveredState;
  const activeData = activeState ? stateMap.get(activeState) : null;

  if (inspections.length === 0) return null;

  /* Dot radius scales with count */
  function dotRadius(count: number): number {
    if (maxCount === 0) return 0;
    const t = count / maxCount;
    return 4 + t * 14; // 4px min, 18px max
  }

  /* Dot opacity scales with count */
  function dotOpacity(count: number): number {
    if (maxCount === 0) return 0;
    return 0.35 + (count / maxCount) * 0.6;
  }

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

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
          Inspection Map
        </p>
        <span className="text-[10px] text-[var(--ink-muted)]">
          {stateMap.size} state{stateMap.size !== 1 ? "s" : ""} &middot; {inspections.length} inspection{inspections.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* SVG Map */}
        <div className="flex-1 px-2 pb-2">
          <svg viewBox="60 50 880 540" className="w-full h-auto" style={{ maxHeight: 360 }}>
            {/* State outlines */}
            {Object.entries(US_STATES).map(([abbr, { path }]) => {
              const isActive = activeState === abbr;
              return (
                <path
                  key={abbr}
                  d={path}
                  fill={isActive ? "var(--accent-soft)" : "var(--surface-2)"}
                  stroke="var(--border)"
                  strokeWidth={isActive ? 1.5 : 0.5}
                  className="transition-colors duration-100"
                  onMouseEnter={() => setHoveredState(abbr)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => setSelectedState(selectedState === abbr ? null : abbr)}
                />
              );
            })}

            {/* Inspection dots */}
            {Object.entries(US_STATES).map(([abbr, { cx, cy }]) => {
              const data = stateMap.get(abbr);
              if (!data || data.total === 0) return null;
              const r = dotRadius(data.total);
              const hasOos = data.oos > 0;
              const isActive = activeState === abbr;

              return (
                <g key={`dot-${abbr}`}>
                  {/* Glow ring on hover */}
                  {isActive && (
                    <circle
                      cx={cx} cy={cy} r={r + 4}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  )}
                  {/* Main dot */}
                  <circle
                    cx={cx} cy={cy} r={r}
                    fill={hasOos ? "#e11d48" : "var(--accent)"}
                    opacity={isActive ? 0.95 : dotOpacity(data.total)}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredState(abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(selectedState === abbr ? null : abbr)}
                  />
                  {/* Count label on larger dots */}
                  {r >= 10 && (
                    <text
                      x={cx} y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={r >= 14 ? 10 : 8}
                      fontWeight={600}
                      fill="#fff"
                      className="pointer-events-none select-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {data.total}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Sidebar */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-[var(--border)] px-4 py-3">
          {activeData ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {STATE_NAMES[activeData.state] ?? activeData.state}
                </p>
                <p className="text-[10px] text-[var(--ink-muted)]">
                  {activeData.total} inspection{activeData.total !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center">
                  <p className="text-base font-bold text-[var(--ink)]">{activeData.vehicleViols}</p>
                  <p className="text-[9px] text-[var(--ink-muted)]">Vehicle viols</p>
                </div>
                <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-center">
                  <p className="text-base font-bold text-[var(--ink)]">{activeData.driverViols}</p>
                  <p className="text-[9px] text-[var(--ink-muted)]">Driver viols</p>
                </div>
              </div>

              {activeData.oos > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 ring-1 ring-rose-200">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium text-rose-700">
                    {activeData.oos} out-of-service
                  </span>
                  <span className="ml-auto text-[10px] text-rose-500">
                    {((activeData.oos / activeData.total) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
                Top States
              </p>
              <div className="space-y-1">
                {topStates.map((sd) => (
                  <button
                    key={sd.state}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                    onMouseEnter={() => setHoveredState(sd.state)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => setSelectedState(selectedState === sd.state ? null : sd.state)}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${sd.oos > 0 ? "bg-rose-500" : "bg-accent"}`}
                      style={{ opacity: dotOpacity(sd.total) }}
                    />
                    <span className="text-xs font-medium text-[var(--ink)] w-6">{sd.state}</span>
                    <div className="flex-1 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full ${sd.oos > 0 ? "bg-rose-400" : "bg-accent-soft0"}`}
                        style={{ width: `${(sd.total / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--ink-muted)] w-5 text-right">{sd.total}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] text-[10px] text-[var(--ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent opacity-70" />
          Inspections
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500 opacity-70" />
          Has OOS violations
        </span>
        <span className="ml-auto">Dot size = inspection count</span>
      </div>
    </div>
  );
}
