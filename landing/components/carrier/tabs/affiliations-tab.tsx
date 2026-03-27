"use client";

import { useState } from "react";
import { SkeletonRows } from "../shared";
import type { AffiliationsData, AffiliationEntry } from "../types";

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  POSSIBLE_CHAMELEON: { bg: "bg-rose-50", text: "text-rose-700" },
  COMMON_OWNER: { bg: "bg-amber-50", text: "text-amber-700" },
  COMMON_EQUIPMENT: { bg: "bg-blue-50", text: "text-blue-700" },
  UNKNOWN: { bg: "bg-gray-50", text: "text-gray-500" },
};

const TYPE_LABELS: Record<string, string> = {
  POSSIBLE_CHAMELEON: "Possible Chameleon",
  COMMON_OWNER: "Common Owner",
  COMMON_EQUIPMENT: "Shared Equipment",
  UNKNOWN: "Unknown",
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 60
      ? "bg-rose-500"
      : score >= 30
        ? "bg-amber-500"
        : score >= 10
          ? "bg-blue-500"
          : "bg-gray-400";

  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs font-semibold tabular-nums text-gray-900">{score}</span>
    </div>
  );
}

function VinDrawer({
  entry,
  dotNumber,
  onClose,
}: {
  entry: AffiliationEntry;
  dotNumber: string;
  onClose: () => void;
}) {
  const [vinDetails, setVinDetails] = useState<Record<string, unknown>[] | null>(null);
  const [loadingVin, setLoadingVin] = useState<string | null>(null);

  async function loadVinDetail(vin: string) {
    setLoadingVin(vin);
    try {
      const r = await fetch(`/api/carrier/${dotNumber}/affiliations/vin/${vin}`);
      if (r.ok) {
        const data = await r.json();
        setVinDetails(data.carriers ?? []);
      }
    } finally {
      setLoadingVin(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative w-full max-w-lg overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Shared VINs with {entry.legalName ?? `DOT ${entry.dotNumber}`}
              </h3>
              <p className="text-xs text-gray-500">
                {entry.sharedVinCount} shared vehicle{entry.sharedVinCount !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {entry.sharedVins.map((vin) => (
            <div
              key={vin}
              className="rounded-lg border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono font-semibold text-gray-900">{vin}</code>
                <button
                  onClick={() => loadVinDetail(vin)}
                  disabled={loadingVin === vin}
                  className="text-[10px] text-indigo-600 hover:text-indigo-700"
                >
                  {loadingVin === vin ? "Loading..." : "View details"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {vinDetails && (
          <div className="border-t border-gray-200 p-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Carrier Timeline
            </h4>
            {vinDetails.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 text-xs">
                <div className="h-2 w-2 rounded-full bg-indigo-400" />
                <div>
                  <span className="font-medium text-gray-900">
                    {(c as { legalName?: string }).legalName ?? `DOT ${(c as { dotNumber?: number }).dotNumber}`}
                  </span>
                  <span className="ml-2 text-gray-400">
                    {(c as { firstSeenAt?: string }).firstSeenAt
                      ? new Date((c as { firstSeenAt: string }).firstSeenAt).toLocaleDateString()
                      : "Unknown"}{" "}
                    —{" "}
                    {(c as { lastSeenAt?: string }).lastSeenAt
                      ? new Date((c as { lastSeenAt: string }).lastSeenAt).toLocaleDateString()
                      : "Present"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AffiliationsTab({
  data,
  loading,
  error,
  dotNumber,
}: {
  data: AffiliationsData | null;
  loading: boolean;
  error: string | null;
  dotNumber: string;
}) {
  const [selectedEntry, setSelectedEntry] = useState<AffiliationEntry | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "count">("score");

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <SkeletonRows count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data || data.affiliations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-indigo-600">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="5" cy="5" r="3" /><circle cx="9" cy="9" r="3" /><path d="M7 3L11 7" />
              </svg>
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              VIN Affiliations
            </h3>
          </div>
          <p className="text-sm text-gray-500">
            {data?.totalVins === 0
              ? "No vehicle VINs recorded for this carrier. Import VINs or check the Fleet tab."
              : "No shared VINs detected with other carriers."}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {data?.totalVins ?? 0} VINs on file for this carrier.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...data.affiliations].sort((a, b) =>
    sortBy === "score"
      ? b.affiliationScore - a.affiliationScore
      : b.sharedVinCount - a.sharedVinCount
  );

  const chameleonCount = sorted.filter((a) => a.affiliationType === "POSSIBLE_CHAMELEON").length;
  const ownerCount = sorted.filter((a) => a.affiliationType === "COMMON_OWNER").length;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-indigo-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="5" cy="5" r="3" /><circle cx="9" cy="9" r="3" /><path d="M7 3L11 7" />
            </svg>
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
            VIN Affiliations
          </h3>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.affiliatedCarrierCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Linked Carriers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.totalSharedVinCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Shared VINs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-600">{chameleonCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Chameleon Flags</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{ownerCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Common Owner</p>
          </div>
        </div>
      </div>

      {/* Linked Carriers Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Linked Carriers</h3>
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy("score")}
              className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                sortBy === "score" ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              By Score
            </button>
            <button
              onClick={() => setSortBy("count")}
              className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                sortBy === "count" ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              By VINs
            </button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2 text-left">Carrier</th>
              <th className="px-4 py-2 text-center">Shared VINs</th>
              <th className="px-4 py-2 text-center">Score</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Signals</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const style = TYPE_STYLES[entry.affiliationType] ?? TYPE_STYLES.UNKNOWN;
              const rowBg =
                entry.affiliationType === "POSSIBLE_CHAMELEON"
                  ? "bg-rose-50/30"
                  : entry.affiliationType === "COMMON_OWNER"
                    ? "bg-amber-50/20"
                    : "";

              return (
                <tr
                  key={entry.dotNumber}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${rowBg}`}
                >
                  <td className="px-4 py-2.5">
                    <a
                      href={`/?dot=${entry.dotNumber}`}
                      className="font-medium text-gray-900 hover:text-indigo-600"
                    >
                      {entry.legalName ?? `DOT ${entry.dotNumber}`}
                    </a>
                    <p className="text-[10px] text-gray-400 tabular-nums">
                      DOT {entry.dotNumber}
                      {entry.statusCode && (
                        <span
                          className={`ml-2 ${
                            entry.statusCode === "A" ? "text-emerald-500" : "text-rose-500"
                          }`}
                        >
                          {entry.statusCode === "A" ? "Active" : "Inactive"}
                        </span>
                      )}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-semibold tabular-nums text-gray-900">
                      {entry.sharedVinCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <ScoreBadge score={entry.affiliationScore} />
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.bg} ${style.text}`}
                    >
                      {TYPE_LABELS[entry.affiliationType] ?? entry.affiliationType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {entry.signals.slice(0, 2).map((s, i) => (
                        <span key={i} className="text-[10px] text-gray-500">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View VINs
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VIN Drawer */}
      {selectedEntry && (
        <VinDrawer
          entry={selectedEntry}
          dotNumber={dotNumber}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
