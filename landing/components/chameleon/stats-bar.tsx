"use client";

import { useEffect, useState } from "react";

type Stats = {
  carrierCount: number;
  clusterCount: number;
  highRiskCount: number;
  lastSync: { date: string; status: string } | null;
};

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chameleon/stats")
      .then(async (r) => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  const cards = [
    { label: "Carriers Tracked", value: stats?.carrierCount ?? "—" },
    { label: "Chameleon Clusters", value: stats?.clusterCount ?? "—" },
    { label: "High Risk", value: stats?.highRiskCount ?? "—" },
    {
      label: "Last Sync",
      value: stats?.lastSync
        ? new Date(stats.lastSync.date).toLocaleDateString()
        : "—",
    },
  ];

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
        Stats error: {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {typeof card.value === "number"
              ? card.value.toLocaleString()
              : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
