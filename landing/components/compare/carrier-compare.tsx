"use client";

import { useState, useCallback } from "react";
import type {
  CompareCarrier,
  ComparePayload,
  CompareBasicScore,
} from "@/app/api/carrier/compare/route";

/* ────────────────────────────────────────────────────────────────
   BASIC score category → color mapping
   ──────────────────────────────────────────────────────────────── */

function basicBarColor(percentile: number): string {
  if (percentile >= 75) return "bg-red-500";
  if (percentile >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950";
    case "B":
      return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950";
    case "C":
      return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950";
    case "D":
      return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950";
    default:
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";
  }
}

function statusBadge(statusCode: string | null, allowedToOperate: string | null) {
  const isActive = statusCode === "A" || allowedToOperate === "Y";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   Highlight helpers: best/worst across carriers
   ──────────────────────────────────────────────────────────────── */

type HighlightDirection = "lower-is-better" | "higher-is-better";

function getHighlightClass(
  value: number,
  allValues: number[],
  direction: HighlightDirection
): string {
  if (allValues.length < 2) return "";
  const sorted = [...allValues].sort((a, b) => a - b);
  const best = direction === "lower-is-better" ? sorted[0] : sorted[sorted.length - 1];
  const worst = direction === "lower-is-better" ? sorted[sorted.length - 1] : sorted[0];
  if (value === best && best !== worst) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (value === worst && best !== worst) return "text-red-600 dark:text-red-400 font-semibold";
  return "";
}

/* ────────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────────── */

export function CarrierCompare() {
  const [dotInput, setDotInput] = useState("");
  const [dotNumbers, setDotNumbers] = useState<string[]>([]);
  const [carriers, setCarriers] = useState<CompareCarrier[]>([]);
  const [errors, setErrors] = useState<{ dotNumber: string; message: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComparison = useCallback(async (dots: string[]) => {
    if (dots.length === 0) {
      setCarriers([]);
      setErrors([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/carrier/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dotNumbers: dots }),
      });
      const data: ComparePayload = await res.json();
      setCarriers(data.carriers);
      setErrors(data.errors);
    } catch {
      setErrors([{ dotNumber: "all", message: "Failed to fetch comparison data" }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCarrier = () => {
    const trimmed = dotInput.trim();
    if (!trimmed || !/^\d{1,10}$/.test(trimmed)) return;
    if (dotNumbers.includes(trimmed)) {
      setDotInput("");
      return;
    }
    if (dotNumbers.length >= 4) return;
    const next = [...dotNumbers, trimmed];
    setDotNumbers(next);
    setDotInput("");
    fetchComparison(next);
  };

  const removeCarrier = (dot: string) => {
    const next = dotNumbers.filter((d) => d !== dot);
    setDotNumbers(next);
    setCarriers((prev) => prev.filter((c) => c.dotNumber !== dot));
    setErrors((prev) => prev.filter((e) => e.dotNumber !== dot));
    if (next.length > 0) {
      // Already have remaining data locally, no need to re-fetch
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCarrier();
    }
  };

  // Collect all values for highlighting
  const allScores = carriers.map((c) => c.riskRating.score);
  const allPowerUnits = carriers.map((c) => c.powerUnits);
  const allDrivers = carriers.map((c) => c.drivers);
  const allVehicleOos = carriers.map((c) => c.oosRates.vehicleOosRate);
  const allDriverOos = carriers.map((c) => c.oosRates.driverOosRate);
  const allHazmatOos = carriers.map((c) => c.oosRates.hazmatOosRate);

  // Collect all BASIC category names across carriers
  const allBasicNames = Array.from(
    new Set(carriers.flatMap((c) => c.basicScores.map((b) => b.name)))
  ).sort();

  function getBasicPercentile(carrier: CompareCarrier, name: string): number | null {
    const found = carrier.basicScores.find((b) => b.name === name);
    return found ? found.percentile : null;
  }

  function getAllBasicValues(name: string): number[] {
    return carriers
      .map((c) => getBasicPercentile(c, name))
      .filter((v): v is number => v !== null);
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-zinc-100">
          Add carrier by USDOT number
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={dotInput}
            onChange={(e) => setDotInput(e.target.value.replace(/\D/g, ""))}
            onKeyDown={handleKeyDown}
            placeholder="Enter USDOT number"
            maxLength={10}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
          />
          <button
            onClick={addCarrier}
            disabled={loading || dotNumbers.length >= 4 || !dotInput.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {loading ? "Loading..." : "Add"}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
          Compare up to 4 carriers side by side. {dotNumbers.length}/4 slots used.
        </p>

        {/* Active DOT tags */}
        {dotNumbers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {dotNumbers.map((dot) => {
              const carrier = carriers.find((c) => c.dotNumber === dot);
              return (
                <span
                  key={dot}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  USDOT {dot}
                  {carrier && (
                    <span className="text-gray-400 dark:text-zinc-500">
                      - {carrier.legalName}
                    </span>
                  )}
                  <button
                    onClick={() => removeCarrier(dot)}
                    className="ml-0.5 text-gray-400 transition hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
                    aria-label={`Remove USDOT ${dot}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err) => (
            <div
              key={err.dotNumber}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
            >
              USDOT {err.dotNumber}: {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: dotNumbers.length }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 h-4 w-3/4 rounded bg-gray-200 dark:bg-zinc-700" />
              <div className="mb-3 h-3 w-1/2 rounded bg-gray-200 dark:bg-zinc-700" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-3 w-full rounded bg-gray-100 dark:bg-zinc-800" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comparison cards */}
      {!loading && carriers.length > 0 && (
        <>
          {/* Carrier info cards */}
          <div className={`grid gap-5 ${carriers.length === 1 ? "grid-cols-1" : carriers.length === 2 ? "sm:grid-cols-2" : carriers.length === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {carriers.map((carrier) => (
              <div
                key={carrier.dotNumber}
                className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Remove button */}
                <button
                  onClick={() => removeCarrier(carrier.dotNumber)}
                  className="absolute right-3 top-3 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-red-400"
                  aria-label={`Remove ${carrier.legalName}`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M4 4l6 6M10 4l-6 6" />
                  </svg>
                </button>

                {/* Header */}
                <div className="mb-4 pr-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-tight">
                    {carrier.legalName}
                  </h3>
                  {carrier.dbaName && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      DBA: {carrier.dbaName}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-zinc-400">
                      USDOT {carrier.dotNumber}
                    </span>
                    {statusBadge(carrier.statusCode, carrier.allowedToOperate)}
                  </div>
                  {carrier.phyCity && carrier.phyState && (
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                      {carrier.phyCity}, {carrier.phyState}
                    </p>
                  )}
                </div>

                {/* Risk grade */}
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${gradeColor(carrier.riskRating.grade)}`}
                  >
                    {carrier.riskRating.grade}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Risk Score</p>
                    <p className={`text-sm font-semibold ${getHighlightClass(carrier.riskRating.score, allScores, "higher-is-better") || "text-gray-900 dark:text-zinc-100"}`}>
                      {carrier.riskRating.score}/100
                    </p>
                  </div>
                </div>

                {/* Key stats */}
                <div className="space-y-2 border-t border-gray-100 pt-3 dark:border-zinc-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">Power Units</span>
                    <span className={`${getHighlightClass(carrier.powerUnits, allPowerUnits, "higher-is-better") || "text-gray-900 dark:text-zinc-100"}`}>
                      {carrier.powerUnits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">Drivers</span>
                    <span className={`${getHighlightClass(carrier.drivers, allDrivers, "higher-is-better") || "text-gray-900 dark:text-zinc-100"}`}>
                      {carrier.drivers.toLocaleString()}
                    </span>
                  </div>
                  {carrier.safetyRating && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Safety Rating</span>
                      <span className="text-gray-900 dark:text-zinc-100">
                        {carrier.safetyRating}
                      </span>
                    </div>
                  )}
                  {carrier.carrierOperation && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Operation</span>
                      <span className="text-gray-900 dark:text-zinc-100">
                        {carrier.carrierOperation}
                      </span>
                    </div>
                  )}
                </div>

                {/* Insurance */}
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">Insurance</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        carrier.insurance.hasActiveInsurance
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                      }`}
                    >
                      {carrier.insurance.hasActiveInsurance ? "On File" : "Not Found"}
                    </span>
                  </div>
                  {carrier.insurance.insurerName && (
                    <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500 truncate" title={carrier.insurance.insurerName}>
                      {carrier.insurance.insurerName}
                    </p>
                  )}
                  {carrier.insurance.coverageAmount && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500">
                      Coverage: ${parseInt(carrier.insurance.coverageAmount, 10).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* BASIC Scores comparison */}
          {allBasicNames.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                BASIC Scores Comparison
              </h3>
              <div className="space-y-4">
                {allBasicNames.map((name) => {
                  const values = getAllBasicValues(name);
                  return (
                    <div key={name}>
                      <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-zinc-300">
                        {name}
                      </p>
                      <div className="space-y-1.5">
                        {carriers.map((carrier) => {
                          const percentile = getBasicPercentile(carrier, name);
                          return (
                            <div key={carrier.dotNumber} className="flex items-center gap-2">
                              <span className="w-28 shrink-0 truncate text-xs text-gray-500 dark:text-zinc-400" title={carrier.legalName}>
                                {carrier.legalName.length > 16
                                  ? carrier.legalName.slice(0, 16) + "..."
                                  : carrier.legalName}
                              </span>
                              {percentile !== null ? (
                                <>
                                  <div className="flex-1 h-4 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${basicBarColor(percentile)}`}
                                      style={{ width: `${Math.max(percentile, 2)}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`w-10 text-right text-xs font-medium ${getHighlightClass(percentile, values, "lower-is-better") || "text-gray-700 dark:text-zinc-300"}`}
                                  >
                                    {percentile}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="flex-1 h-4 rounded-full bg-gray-50 dark:bg-zinc-850" />
                                  <span className="w-10 text-right text-xs text-gray-300 dark:text-zinc-600">
                                    N/A
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* OOS Rates comparison */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-zinc-100">
              Out-of-Service Rates
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    <th className="pb-2 pr-4 text-left font-medium text-gray-500 dark:text-zinc-400">
                      Carrier
                    </th>
                    <th className="pb-2 px-3 text-right font-medium text-gray-500 dark:text-zinc-400">
                      Vehicle OOS
                    </th>
                    <th className="pb-2 px-3 text-right font-medium text-gray-500 dark:text-zinc-400">
                      Driver OOS
                    </th>
                    <th className="pb-2 px-3 text-right font-medium text-gray-500 dark:text-zinc-400">
                      Hazmat OOS
                    </th>
                    <th className="pb-2 pl-3 text-right font-medium text-gray-500 dark:text-zinc-400">
                      Inspections
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {carriers.map((carrier) => (
                    <tr
                      key={carrier.dotNumber}
                      className="border-b border-gray-50 dark:border-zinc-800/50"
                    >
                      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-zinc-100 truncate max-w-[10rem]">
                        {carrier.legalName}
                      </td>
                      <td className={`py-2 px-3 text-right ${getHighlightClass(carrier.oosRates.vehicleOosRate, allVehicleOos, "lower-is-better") || "text-gray-700 dark:text-zinc-300"}`}>
                        {carrier.oosRates.vehicleOosRate}%
                      </td>
                      <td className={`py-2 px-3 text-right ${getHighlightClass(carrier.oosRates.driverOosRate, allDriverOos, "lower-is-better") || "text-gray-700 dark:text-zinc-300"}`}>
                        {carrier.oosRates.driverOosRate}%
                      </td>
                      <td className={`py-2 px-3 text-right ${getHighlightClass(carrier.oosRates.hazmatOosRate, allHazmatOos, "lower-is-better") || "text-gray-700 dark:text-zinc-300"}`}>
                        {carrier.oosRates.hazmatOosRate}%
                      </td>
                      <td className="py-2 pl-3 text-right text-gray-500 dark:text-zinc-400">
                        {carrier.oosRates.totalInspections}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && carriers.length === 0 && dotNumbers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 dark:border-zinc-700 dark:bg-zinc-900/50">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="mb-4 text-gray-300 dark:text-zinc-600"
          >
            <rect x="3" y="9" width="16" height="30" rx="3" stroke="currentColor" strokeWidth="2" />
            <rect x="29" y="9" width="16" height="30" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M24 16v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Compare carriers side by side
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            Enter up to 4 USDOT numbers to compare safety scores, OOS rates, and more.
          </p>
        </div>
      )}
    </div>
  );
}
