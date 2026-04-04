"use client";

import { useMemo, useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { PathOptions, Layer } from "leaflet";

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

/* ── State centroids (lat, lng) ─────────────────────────────────────── */

const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL: [32.806671, -86.791130],
  AK: [61.370716, -152.404419],
  AZ: [33.729759, -111.431221],
  AR: [34.969704, -92.373123],
  CA: [36.116203, -119.681564],
  CO: [39.059811, -105.311104],
  CT: [41.597782, -72.755371],
  DE: [39.318523, -75.507141],
  FL: [27.766279, -81.686783],
  GA: [33.040619, -83.643074],
  HI: [21.094318, -157.498337],
  ID: [44.240459, -114.478828],
  IL: [40.349457, -88.986137],
  IN: [39.849426, -86.258278],
  IA: [42.011539, -93.210526],
  KS: [38.526600, -96.726486],
  KY: [37.668140, -84.670067],
  LA: [31.169546, -91.867805],
  ME: [44.693947, -69.381927],
  MD: [39.063946, -76.802101],
  MA: [42.230171, -71.530106],
  MI: [43.326618, -84.536095],
  MN: [45.694454, -93.900192],
  MS: [32.741646, -89.678696],
  MO: [38.456085, -92.288368],
  MT: [46.921925, -110.454353],
  NE: [41.125370, -98.268082],
  NV: [38.313515, -117.055374],
  NH: [43.452492, -71.563896],
  NJ: [40.298904, -74.521011],
  NM: [34.840515, -106.248482],
  NY: [42.165726, -74.948051],
  NC: [35.630066, -79.806419],
  ND: [47.528912, -99.784012],
  OH: [40.388783, -82.764915],
  OK: [35.565342, -96.928917],
  OR: [44.572021, -122.070938],
  PA: [40.590752, -77.209755],
  RI: [41.680893, -71.511780],
  SC: [33.856892, -80.945007],
  SD: [44.299782, -99.438828],
  TN: [35.747845, -86.692345],
  TX: [31.054487, -97.563461],
  UT: [40.150032, -111.862434],
  VT: [44.045876, -72.710686],
  VA: [37.769337, -78.169968],
  WA: [47.400902, -121.490494],
  WV: [38.491226, -80.954453],
  WI: [44.268543, -89.616508],
  WY: [42.755966, -107.302490],
  DC: [38.897438, -77.026817],
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

/* ── Fit map to continental US ──────────────────────────────────────── */

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [[24.396308, -125.0], [49.384358, -66.93457]],
      { padding: [10, 10], animate: false }
    );
  }, [map]);
  return null;
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function InspectionMapInner({ inspections }: { inspections: InspectionLike[] }) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  // Load US states GeoJSON
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json")
      .then((r) => r.json())
      .then((data) => setGeoData(data))
      .catch(() => {});
  }, []);

  // Build state name → abbreviation lookup from GeoJSON
  const nameToAbbr = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [abbr, name] of Object.entries(STATE_NAMES)) {
      map[name.toLowerCase()] = abbr;
    }
    return map;
  }, []);

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

  // Style GeoJSON state borders
  function stateStyle(feature?: Feature<Geometry>): PathOptions {
    const name = feature?.properties?.name;
    const abbr = name ? nameToAbbr[name.toLowerCase()] : null;
    const isSelected = abbr === selectedState;
    return {
      fillColor: isSelected ? "rgba(217,119,87,0.12)" : "rgba(0,0,0,0)",
      fillOpacity: 1,
      color: isSelected ? "#d97757" : "#c2c0b6",
      weight: isSelected ? 2 : 0.8,
    };
  }

  function onEachState(feature: Feature<Geometry>, layer: Layer) {
    const name = feature?.properties?.name;
    const abbr = name ? nameToAbbr[name.toLowerCase()] : null;
    if (abbr) {
      layer.on({
        click: () => setSelectedState(selectedState === abbr ? null : abbr),
      });
    }
  }

  const activeData = selectedState ? stateMap.get(selectedState) : null;

  return (
    <div className="flex flex-col lg:flex-row">
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: 340 }}>
        <MapContainer
          center={[39.5, -98.35]}
          zoom={4}
          scrollWheelZoom={false}
          zoomControl={false}
          dragging={true}
          doubleClickZoom={false}
          attributionControl={false}
          style={{ height: "100%", minHeight: 340, background: "var(--surface-1)" }}
        >
          <FitBounds />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
          />
          {geoData && (
            <GeoJSON
              key={selectedState ?? "none"}
              data={geoData}
              style={stateStyle}
              onEachFeature={onEachState}
            />
          )}
          {/* Inspection dots */}
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
                  click: () => setSelectedState(selectedState === abbr ? null : abbr),
                }}
              >
                <Popup>
                  <div className="text-xs leading-relaxed" style={{ minWidth: 140 }}>
                    <p className="font-semibold text-sm">{STATE_NAMES[abbr] ?? abbr}</p>
                    <p className="text-gray-600 mt-1">{data.total} inspection{data.total !== 1 ? "s" : ""}</p>
                    <div className="flex gap-3 mt-1">
                      <span>{data.vehicleViols} vehicle viols</span>
                      <span>{data.driverViols} driver viols</span>
                    </div>
                    {data.oos > 0 && (
                      <p className="text-rose-600 font-medium mt-1">
                        {data.oos} OOS ({((data.oos / data.total) * 100).toFixed(0)}%)
                      </p>
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
              Clear selection
            </button>
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
          </div>
        )}
      </div>
    </div>
  );
}
