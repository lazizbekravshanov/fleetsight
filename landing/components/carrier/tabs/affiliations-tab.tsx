"use client";

import { useState } from "react";
import { SkeletonRows } from "../shared";
import type { AffiliationsData, AffiliationEntry, SharedVinInfo } from "../types";

const TYPE_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  POSSIBLE_CHAMELEON: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
  SHELL_ENTITY: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
  COMMON_FLEET: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  EQUIPMENT_TRANSFER: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
};

const TYPE_LABELS: Record<string, string> = {
  POSSIBLE_CHAMELEON: "Possible Chameleon",
  SHELL_ENTITY: "Shell Entity",
  COMMON_FLEET: "Common Fleet",
  EQUIPMENT_TRANSFER: "Equipment Transfer",
};

const DIRECTION_LABELS: Record<string, string> = {
  A_TO_B: "Transferred to",
  B_TO_A: "Received from",
  CONCURRENT: "Concurrent",
  UNCLEAR: "Unclear",
};

/* ── Signal Bar ─────────────────────────────────────────────────── */

function SignalBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-rose-500" : value >= 40 ? "bg-amber-500" : value >= 10 ? "bg-blue-500" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="w-24 shrink-0 text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-6 text-right font-semibold tabular-nums text-gray-600">{value}</span>
    </div>
  );
}

/* ── VIN Timeline ───────────────────────────────────────────────── */

function VinTimeline({ vin, myDot, entry }: { vin: SharedVinInfo; myDot: string; entry: AffiliationEntry }) {
  const aStart = vin.carrierAFirstSeen ? new Date(vin.carrierAFirstSeen) : null;
  const aEnd = vin.carrierALastSeen ? new Date(vin.carrierALastSeen) : null;
  const bStart = vin.carrierBFirstSeen ? new Date(vin.carrierBFirstSeen) : null;
  const bEnd = vin.carrierBLastSeen ? new Date(vin.carrierBLastSeen) : null;

  const gapLabel =
    vin.gapDays === 0
      ? ""
      : vin.gapDays <= 7
        ? `${vin.gapDays}d gap`
        : vin.gapDays <= 30
          ? `${vin.gapDays}d gap`
          : `${Math.round(vin.gapDays / 30)}mo gap`;

  const gapColor =
    vin.gapDays <= 7 ? "text-rose-600" : vin.gapDays <= 30 ? "text-amber-600" : "text-gray-400";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-2.5">
      <div className="flex items-center justify-between">
        <code className="text-[11px] font-mono font-semibold text-gray-800">{vin.vin}</code>
        <div className="flex items-center gap-2">
          {vin.overlapDays > 0 && (
            <span className="text-[9px] font-medium text-orange-600">{vin.overlapDays}d overlap</span>
          )}
          {gapLabel && <span className={`text-[9px] font-medium ${gapColor}`}>{gapLabel}</span>}
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
            {DIRECTION_LABELS[vin.transferDirection] ?? vin.transferDirection}
          </span>
        </div>
      </div>
      <div className="mt-1.5 space-y-0.5 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-400 flex-shrink-0" />
          <span className="text-gray-500">DOT {myDot}</span>
          <span className="text-gray-400">
            {aStart?.toLocaleDateString() ?? "?"} — {aEnd?.toLocaleDateString() ?? "?"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-400 flex-shrink-0" />
          <span className="text-gray-500">{entry.legalName ?? `DOT ${entry.dotNumber}`}</span>
          <span className="text-gray-400">
            {bStart?.toLocaleDateString() ?? "?"} — {bEnd?.toLocaleDateString() ?? "?"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Detail Drawer ──────────────────────────────────────────────── */

function DetailDrawer({
  entry,
  dotNumber,
  onClose,
}: {
  entry: AffiliationEntry;
  dotNumber: string;
  onClose: () => void;
}) {
  const style = TYPE_STYLES[entry.type] ?? TYPE_STYLES.EQUIPMENT_TRANSFER;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-lg overflow-y-auto bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {entry.legalName ?? `DOT ${entry.dotNumber}`}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
                  {TYPE_LABELS[entry.type] ?? entry.type}
                </span>
                <span className="text-xs text-gray-400">Score: {entry.score}/100</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>

        {/* Signal Breakdown */}
        <div className="border-b border-gray-100 p-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Signal Analysis</h4>
          <div className="space-y-1.5">
            <SignalBar label="VIN Ratio" value={entry.signals.sharedVinRatio} />
            <SignalBar label="Temporal" value={entry.signals.temporalPattern} />
            <SignalBar label="Concurrent" value={entry.signals.concurrentOps} />
            <SignalBar label="Address" value={entry.signals.addressMatch} />
            <SignalBar label="Name" value={entry.signals.nameMatch} />
            <SignalBar label="OOS Reincarn." value={entry.signals.oosReincarnation} />
            <SignalBar label="Fleet Absorb." value={entry.signals.fleetAbsorption} />
          </div>
        </div>

        {/* Evidence */}
        {entry.reasons.length > 0 && (
          <div className="border-b border-gray-100 p-4">
            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Evidence</h4>
            <ul className="space-y-1">
              {entry.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* VIN Timeline */}
        <div className="p-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Shared VIN Timeline ({entry.sharedVinCount})
          </h4>
          <div className="space-y-2">
            {entry.sharedVins.map((vin) => (
              <VinTimeline key={vin.vin} vin={vin} myDot={dotNumber} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Tab ───────────────────────────────────────────────────── */

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
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>;
  }

  if (!data || data.affiliations.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-bold text-gray-900">VIN Affiliations</h3>
        <p className="text-sm text-gray-500">
          {data?.totalVins === 0
            ? "No vehicle VINs recorded for this carrier yet."
            : "No shared VINs detected with other carriers."}
        </p>
        <p className="mt-1 text-xs text-gray-400">{data?.totalVins ?? 0} VINs on file.</p>
      </div>
    );
  }

  const sorted = [...data.affiliations].sort((a, b) =>
    sortBy === "score" ? b.score - a.score : b.sharedVinCount - a.sharedVinCount
  );

  const chameleonCount = sorted.filter((a) => a.type === "POSSIBLE_CHAMELEON").length;
  const shellCount = sorted.filter((a) => a.type === "SHELL_ENTITY").length;
  const fleetCount = sorted.filter((a) => a.type === "COMMON_FLEET").length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-600">
            <circle cx="5" cy="5" r="3" /><circle cx="9" cy="9" r="3" />
          </svg>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">VIN Affiliations</h3>
          {data.cluster && (
            <span className="ml-auto text-[10px] text-gray-400">
              Cluster: {data.cluster.members.length} carriers
            </span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.affiliatedCarrierCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Linked</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data.totalSharedVinCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Shared VINs</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${chameleonCount > 0 ? "text-rose-600" : "text-gray-300"}`}>{chameleonCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Chameleon</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${shellCount > 0 ? "text-orange-600" : "text-gray-300"}`}>{shellCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Shell</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${fleetCount > 0 ? "text-amber-600" : "text-gray-300"}`}>{fleetCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Common Fleet</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Linked Carriers</h3>
          <div className="flex gap-1">
            {(["score", "count"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                  sortBy === s ? "bg-indigo-100 text-indigo-700" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                By {s === "score" ? "Score" : "VINs"}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2 text-left">Carrier</th>
              <th className="px-4 py-2 text-center">VINs</th>
              <th className="px-4 py-2 text-center">Score</th>
              <th className="px-4 py-2 text-left">Classification</th>
              <th className="px-4 py-2 text-left">Top Signal</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => {
              const style = TYPE_STYLES[entry.type] ?? TYPE_STYLES.EQUIPMENT_TRANSFER;
              const topReason = entry.reasons[0] ?? "";

              return (
                <tr key={entry.dotNumber} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <a href={`/?dot=${entry.dotNumber}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {entry.legalName ?? `DOT ${entry.dotNumber}`}
                    </a>
                    <p className="text-[10px] text-gray-400">DOT {entry.dotNumber}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold tabular-nums">{entry.sharedVinCount}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-semibold tabular-nums ${
                      entry.score >= 60 ? "text-rose-600" : entry.score >= 30 ? "text-amber-600" : "text-gray-600"
                    }`}>{entry.score}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${style.bg} ${style.text} ${style.ring}`}>
                      {TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <span className="text-[10px] text-gray-500 truncate block">{topReason}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedEntry && (
        <DetailDrawer entry={selectedEntry} dotNumber={dotNumber} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
