"use client";

import { useState } from "react";
import type { WatchedCarrier } from "@prisma/client";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const isGood = status === "AUTHORIZED" || status === "ACTIVE";
  const isBad = status === "OUT-OF-SERVICE" || status === "NOT AUTHORIZED" || status === "NONE ACTIVE";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isGood ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
      : isBad ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
      : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
    }`}>
      {status}
    </span>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={spinning ? "animate-spin" : ""}
    >
      <path d="M10.5 6A4.5 4.5 0 1 1 8.5 2.2" />
      <path d="M10.5 1.5V4H8" />
    </svg>
  );
}

export function WatchlistSection({ initial }: { initial: WatchedCarrier[] }) {
  const [carriers, setCarriers] = useState<WatchedCarrier[]>(initial);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function refreshCarrier(dot: string) {
    setRefreshing(dot);
    try {
      const res = await fetch(`/api/watchlist/${dot}`, { method: "PATCH" });
      if (res.ok) {
        const { carrier } = await res.json();
        setCarriers((prev) =>
          prev.map((c) => (c.dotNumber === dot ? carrier : c))
        );
      }
    } finally {
      setRefreshing(null);
    }
  }

  async function removeCarrier(dot: string) {
    setRemoving(dot);
    try {
      await fetch(`/api/watchlist/${dot}`, { method: "DELETE" });
      setCarriers((prev) => prev.filter((c) => c.dotNumber !== dot));
    } finally {
      setRemoving(null);
    }
  }

  if (carriers.length === 0) {
    return (
      <section id="watchlist">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Watchlist</h2>
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No carriers watched yet.</p>
          <p className="mt-1 text-xs text-gray-300">
            Open any carrier and click <strong>Watch</strong> to track their status.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="watchlist">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Watchlist <span className="ml-1 text-gray-400 font-normal">({carriers.length})</span>
        </h2>
      </div>
      <div className="space-y-2">
        {carriers.map((c) => (
          <div
            key={c.dotNumber}
            className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ${
              c.statusChanged ? "border-amber-300 bg-amber-50/40" : "border-gray-200"
            }`}
          >
            {/* Status change indicator */}
            {c.statusChanged && (
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" title="Status changed since last check" />
            )}

            {/* Carrier info */}
            <a
              href={`/?dot=${c.dotNumber}`}
              className="min-w-0 flex-1 hover:underline"
            >
              <p className="truncate text-sm font-medium text-gray-900">{c.legalName}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">USDOT {c.dotNumber}</p>
            </a>

            {/* Status badges */}
            <div className="flex flex-shrink-0 flex-wrap gap-1.5">
              <StatusBadge status={c.lastUsdotStatus} />
              <StatusBadge status={c.lastAuthStatus} />
              {c.lastCheckedAt && (
                <span className="text-[10px] text-gray-300 self-center">
                  {new Date(c.lastCheckedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1">
              <button
                onClick={() => refreshCarrier(c.dotNumber)}
                disabled={refreshing === c.dotNumber}
                title="Refresh FMCSA status"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                <RefreshIcon spinning={refreshing === c.dotNumber} />
              </button>
              <button
                onClick={() => removeCarrier(c.dotNumber)}
                disabled={removing === c.dotNumber}
                title="Remove from watchlist"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
