"use client";

import { useState } from "react";
import { StatsBar } from "./stats-bar";
import { CarrierSearch } from "./carrier-search";
import { CarrierDetail } from "./carrier-detail";
import { NetworkGraph } from "./network-graph";

export function ChameleonDashboard() {
  const [selectedDot, setSelectedDot] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <StatsBar />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: Search */}
        <CarrierSearch onSelect={setSelectedDot} />

        {/* Right: Detail + Graph */}
        <div className="space-y-6">
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
            <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70 text-slate-400">
              Search for a carrier to view its chameleon network
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
