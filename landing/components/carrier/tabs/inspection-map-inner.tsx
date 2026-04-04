"use client";

import { useMemo, useState, useEffect, Component, type ReactNode } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

/* ── Error boundary ─────────────────────────────────────────────────── */

class MapErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/* ── State centroids (lat, lng) ─────────────────────────────────────── */

const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.81, -86.79], AK: [61.37, -152.40], AZ: [33.73, -111.43],
  AR: [34.97, -92.37], CA: [36.12, -119.68], CO: [39.06, -105.31],
  CT: [41.60, -72.76], DE: [39.32, -75.51], FL: [27.77, -81.69],
  GA: [33.04, -83.64], HI: [21.09, -157.50], ID: [44.24, -114.48],
  IL: [40.35, -88.99], IN: [39.85, -86.26], IA: [42.01, -93.21],
  KS: [38.53, -96.73], KY: [37.67, -84.67], LA: [31.17, -91.87],
  ME: [44.69, -69.38], MD: [39.06, -76.80], MA: [42.23, -71.53],
  MI: [43.33, -84.54], MN: [45.69, -93.90], MS: [32.74, -89.68],
  MO: [38.46, -92.29], MT: [46.92, -110.45], NE: [41.13, -98.27],
  NV: [38.31, -117.06], NH: [43.45, -71.56], NJ: [40.30, -74.52],
  NM: [34.84, -106.25], NY: [42.17, -74.95], NC: [35.63, -79.81],
  ND: [47.53, -99.78], OH: [40.39, -82.76], OK: [35.57, -96.93],
  OR: [44.57, -122.07], PA: [40.59, -77.21], RI: [41.68, -71.51],
  SC: [33.86, -80.95], SD: [44.30, -99.44], TN: [35.75, -86.69],
  TX: [31.05, -97.56], UT: [40.15, -111.86], VT: [44.05, -72.71],
  VA: [37.77, -78.17], WA: [47.40, -121.49], WV: [38.49, -80.95],
  WI: [44.27, -89.62], WY: [42.76, -107.30], DC: [38.90, -77.03],
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

/* ── Fit bounds helper ──────────────────────────────────────────────── */

function FitUS() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[24.4, -125.0], [49.4, -66.9]], { padding: [10, 10], animate: false });
  }, [map]);
  return null;
}

/* ── Map component ──────────────────────────────────────────────────── */

function InspectionMapLeaflet({ inspections }: { inspections: InspectionLike[] }) {
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

  function dotRadius(count: number): number {
    if (maxCount === 0) return 4;
    return 5 + (count / maxCount) * 18;
  }

  function dotOpacity(count: number): number {
    if (maxCount === 0) return 0.4;
    return 0.4 + (count / maxCount) * 0.5;
  }

  const activeData = selectedState ? stateMap.get(selectedState) : null;

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="flex-1 relative" style={{ minHeight: 340 }}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={true}
          doubleClickZoom={false}
          attributionControl={false}
          style={{ height: "100%", minHeight: 340, background: "#f5f3ee" }}
        >
          <FitUS />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {Object.entries(STATE_CENTROIDS).map(([abbr, [lat, lng]]) => {
            const data = stateMap.get(abbr);
            if (!data || data.total === 0) return null;
            const hasOos = data.oos > 0;
            return (
              <CircleMarker
                key={abbr}
                center={[lat, lng]}
                radius={dotRadius(data.total)}
                pathOptions={{
                  fillColor: hasOos ? "#e11d48" : "#d97757",
                  fillOpacity: dotOpacity(data.total),
                  color: hasOos ? "#be123c" : "#c4623f",
                  weight: 1.5,
                }}
                eventHandlers={{
                  click: () => setSelectedState(abbr),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 140, fontSize: 12, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{STATE_NAMES[abbr] ?? abbr}</div>
                    <div style={{ color: "#666", marginTop: 4 }}>{data.total} inspection{data.total !== 1 ? "s" : ""}</div>
                    <div style={{ marginTop: 4, display: "flex", gap: 12 }}>
                      <span>{data.vehicleViols} vehicle</span>
                      <span>{data.driverViols} driver</span>
                    </div>
                    {data.oos > 0 && (
                      <div style={{ color: "#e11d48", fontWeight: 500, marginTop: 4 }}>
                        {data.oos} OOS ({((data.oos / data.total) * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Sidebar */}
      <div className="lg:w-60 border-t lg:border-t-0 lg:border-l border-[var(--border)] px-4 py-3">
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
            <button
              onClick={() => setSelectedState(null)}
              className="text-[10px] text-accent hover:text-accent-hover"
            >
              Back to overview
            </button>
          </div>
        ) : (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-2">
              Top States
            </p>
            {topStates.length === 0 ? (
              <p className="text-xs text-[var(--ink-muted)]">No state data</p>
            ) : (
              <div className="space-y-1">
                {topStates.map((sd) => (
                  <button
                    key={sd.state}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)]"
                    onClick={() => setSelectedState(sd.state)}
                  >
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${sd.oos > 0 ? "bg-rose-500" : "bg-accent"}`} />
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Default export with error boundary ─────────────────────────────── */

export default function InspectionMapInner({ inspections }: { inspections: InspectionLike[] }) {
  return (
    <MapErrorBoundary
      fallback={
        <div className="flex items-center justify-center px-4 py-12 text-xs text-[var(--ink-muted)]">
          Map could not be loaded.
        </div>
      }
    >
      <InspectionMapLeaflet inspections={inspections} />
    </MapErrorBoundary>
  );
}
