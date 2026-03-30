"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ── Types ────────────────────────────────────────────────────────

interface CarrierPoint {
  dotNumber: number;
  legalName: string;
  lat: number;
  lng: number;
  status: string | null;
}

interface CrashPoint {
  id: string;
  dotNumber: number;
  lat: number;
  lng: number;
  fatalities: number;
  injuries: number;
  reportDate: string | null;
  legalName: string | null;
}

interface MapData {
  carriers: CarrierPoint[];
  crashes: CrashPoint[];
}

type LayerType = "all" | "carriers" | "crashes";

// ── FlyTo helper ─────────────────────────────────────────────────

function FlyTo({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom ?? 10, { duration: 1.5 });
    }
  }, [map, center, zoom]);
  return null;
}

// ── Bounds reporter ──────────────────────────────────────────────

function BoundsReporter({ onBoundsChange }: { onBoundsChange: (b: string) => void }) {
  useMapEvents({
    moveend(e) {
      const b = e.target.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      onBoundsChange(`${sw.lat},${sw.lng},${ne.lat},${ne.lng}`);
    },
  });
  return null;
}

// ── Status color helper ──────────────────────────────────────────

function statusColor(status: string | null): string {
  if (!status) return "#3b82f6"; // blue-500
  const s = status.toUpperCase();
  if (s === "A") return "#3b82f6";
  if (s === "OOS" || s === "I") return "#ef4444";
  return "#f59e0b"; // amber
}

// ── Main Component ───────────────────────────────────────────────

export default function MapInner() {
  const [data, setData] = useState<MapData>({ carriers: [], crashes: [] });
  const [loading, setLoading] = useState(true);
  const [layer, setLayer] = useState<LayerType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [isDark, setIsDark] = useState(false);
  const boundsRef = useRef<string>("");

  // Detect dark mode
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mql.matches || document.documentElement.classList.contains("dark"));
    const handler = () =>
      setIsDark(mql.matches || document.documentElement.classList.contains("dark"));
    mql.addEventListener("change", handler);

    // Also observe class changes on <html> for tailwind dark mode toggle
    const observer = new MutationObserver(() => {
      setIsDark(
        document.documentElement.classList.contains("dark") || mql.matches
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      mql.removeEventListener("change", handler);
      observer.disconnect();
    };
  }, []);

  // Fetch map data
  const fetchData = useCallback(async (bounds?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (bounds) params.set("bounds", bounds);
      const res = await fetch(`/api/map/carriers?${params.toString()}`);
      if (res.ok) {
        const json: MapData = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load map data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle bounds change -- debounced refetch
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBoundsChange = useCallback(
    (bounds: string) => {
      boundsRef.current = bounds;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fetchData(bounds);
      }, 600);
    },
    [fetchData]
  );

  // Search for carrier by USDOT
  const handleSearch = useCallback(() => {
    const dotStr = searchQuery.trim();
    if (!dotStr) return;
    const dot = parseInt(dotStr, 10);
    if (isNaN(dot)) return;

    const carrier = data.carriers.find((c) => c.dotNumber === dot);
    if (carrier) {
      setFlyTarget([carrier.lat, carrier.lng]);
    } else {
      // Try fetching that specific carrier from the full dataset
      fetch(`/api/map/carriers?type=carriers`)
        .then((r) => r.json())
        .then((json: MapData) => {
          const c = json.carriers.find((c) => c.dotNumber === dot);
          if (c) {
            setFlyTarget([c.lat, c.lng]);
            setData((prev) => ({
              ...prev,
              carriers: [...prev.carriers, c],
            }));
          }
        })
        .catch(() => {});
    }
  }, [searchQuery, data.carriers]);

  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttr = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  const showCarriers = layer === "all" || layer === "carriers";
  const showCrashes = layer === "all" || layer === "crashes";

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <MapContainer
        center={[39.8, -98.5]}
        zoom={4}
        className="h-full w-full z-0"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution={tileAttr} />
        <BoundsReporter onBoundsChange={handleBoundsChange} />
        <FlyTo center={flyTarget} zoom={10} />

        {/* Carrier markers */}
        {showCarriers &&
          data.carriers.map((c) => (
            <CircleMarker
              key={`c-${c.dotNumber}`}
              center={[c.lat, c.lng]}
              radius={6}
              pathOptions={{
                color: statusColor(c.status),
                fillColor: statusColor(c.status),
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-semibold text-zinc-900">{c.legalName}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    USDOT: {c.dotNumber}
                  </p>
                  <p className="text-xs mt-1">
                    Status:{" "}
                    <span
                      className={
                        c.status === "A"
                          ? "text-green-600 font-medium"
                          : c.status === "OOS" || c.status === "I"
                          ? "text-red-600 font-medium"
                          : "text-amber-600 font-medium"
                      }
                    >
                      {c.status === "A"
                        ? "Active"
                        : c.status === "OOS"
                        ? "Out of Service"
                        : c.status === "I"
                        ? "Inactive"
                        : c.status ?? "Unknown"}
                    </span>
                  </p>
                  <a
                    href={`/carrier/${c.dotNumber}`}
                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    View carrier detail &rarr;
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        {/* Crash markers */}
        {showCrashes &&
          data.crashes.map((crash) => {
            const radius = Math.min(4 + crash.fatalities * 2, 16);
            return (
              <CircleMarker
                key={`cr-${crash.id}`}
                center={[crash.lat, crash.lng]}
                radius={radius}
                pathOptions={{
                  color: "#dc2626",
                  fillColor: "#ef4444",
                  fillOpacity: 0.6,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[200px]">
                    <p className="font-semibold text-red-700">Crash Report</p>
                    {crash.legalName && (
                      <p className="text-zinc-700 text-xs mt-0.5">
                        {crash.legalName}
                      </p>
                    )}
                    <p className="text-zinc-500 text-xs">
                      USDOT: {crash.dotNumber}
                    </p>
                    {crash.reportDate && (
                      <p className="text-xs mt-1">
                        Date:{" "}
                        {new Date(crash.reportDate).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs">
                      <span className="text-red-600">
                        Fatalities: {crash.fatalities}
                      </span>
                      <span className="text-amber-600">
                        Injuries: {crash.injuries}
                      </span>
                    </div>
                    <a
                      href={`/carrier/${crash.dotNumber}`}
                      className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      View carrier &rarr;
                    </a>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 pointer-events-none">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-4 py-2 rounded-lg shadow-lg">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Loading map data...
            </span>
          </div>
        </div>
      )}

      {/* Control panel */}
      <div className="absolute top-4 right-4 z-30 w-72 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm rounded-xl shadow-lg p-4 space-y-4">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Find carrier by USDOT
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="e.g. 1234567"
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Go
            </button>
          </div>
        </div>

        {/* Layer toggle */}
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
            Map layers
          </label>
          <div className="flex gap-1.5">
            {(["all", "carriers", "crashes"] as LayerType[]).map((l) => (
              <button
                key={l}
                onClick={() => setLayer(l)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                  layer === l
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {l === "all" ? "All" : l === "carriers" ? "Carriers" : "Crashes"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          {showCarriers && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
              {data.carriers.length} carriers
            </span>
          )}
          {showCrashes && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />
              {data.crashes.length} crashes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
