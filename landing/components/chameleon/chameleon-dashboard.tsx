"use client";

import { useState } from "react";
import { StatsBar } from "./stats-bar";
import { CarrierSearch } from "./carrier-search";
import { CarrierDetail } from "./carrier-detail";
import { NetworkGraph } from "./network-graph";

type Stats = {
  carrierCount: number;
  clusterCount: number;
  highRiskCount: number;
  lastSync: { date: string; status: string } | null;
};

export function ChameleonDashboard({
  initialStats,
}: {
  initialStats: Stats;
}) {
  const [selectedDot, setSelectedDot] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <StatsBar stats={initialStats} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        {/* Left: Search */}
        <CarrierSearch
          onSelect={setSelectedDot}
          selectedDot={selectedDot}
        />

        {/* Right: Detail + Graph */}
        <div className="space-y-5">
          {selectedDot ? (
            <>
              <NetworkGraph
                dotNumber={selectedDot}
                onSelectDot={setSelectedDot}
              />
              <CarrierDetail
                dotNumber={selectedDot}
                onSelectDot={setSelectedDot}
              />
            </>
          ) : (
            <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-surface-1/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/40">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-600">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">
                No carrier selected
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Search by name or DOT number to view the chameleon network
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
