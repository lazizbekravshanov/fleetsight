"use client";

import { useState, useEffect } from "react";

type RosterCarrier = {
  dotNumber: string;
  legalName: string;
  healthStatus: string;
  lastGrade: string | null;
  lastScore: number | null;
  lastCheckedAt: string | null;
};

type Roster = {
  id: string;
  name: string;
  carriers: RosterCarrier[];
};

const STATUS_COLORS: Record<string, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
  unknown: "bg-gray-300",
};

const STATUS_RING: Record<string, string> = {
  green: "ring-emerald-200",
  yellow: "ring-amber-200",
  red: "ring-rose-200",
  unknown: "ring-gray-200",
};

export function FleetHealthSection() {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => (r.ok ? r.json() : { rosters: [] }))
      .then(async (data) => {
        // Fetch carriers for first roster
        const rosterList = data.rosters ?? [];
        if (rosterList.length > 0) {
          const first = rosterList[0];
          const detail = await fetch(`/api/roster/${first.id}`).then((r) =>
            r.ok ? r.json() : { carriers: [] }
          );
          setRosters([{ ...first, carriers: detail.carriers ?? [] }]);
          setExpandedId(first.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (rosters.length === 0) return null;

  const roster = rosters[0];
  if (!roster?.carriers?.length) return null;

  const statusCounts = { green: 0, yellow: 0, red: 0, unknown: 0 };
  for (const c of roster.carriers) {
    const s = c.healthStatus as keyof typeof statusCounts;
    if (s in statusCounts) statusCounts[s]++;
    else statusCounts.unknown++;
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Fleet Health <span className="ml-1 text-gray-400 font-normal">({roster.carriers.length} carriers)</span>
        </h2>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {statusCounts.red > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> {statusCounts.red} red
            </span>
          )}
          {statusCounts.yellow > 0 && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> {statusCounts.yellow} yellow
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> {statusCounts.green} green
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {roster.carriers.slice(0, 50).map((c) => (
            <a
              key={c.dotNumber}
              href={`/?dot=${c.dotNumber}`}
              title={`${c.legalName} — ${c.healthStatus}`}
              className={`group flex h-10 w-full items-center justify-center rounded-lg ring-1 ${
                STATUS_COLORS[c.healthStatus] ?? STATUS_COLORS.unknown
              } ${STATUS_RING[c.healthStatus] ?? STATUS_RING.unknown} transition-transform hover:scale-110`}
            >
              <span className="text-[9px] font-bold text-white drop-shadow-sm">
                {c.lastGrade ?? "?"}
              </span>
            </a>
          ))}
        </div>
        {roster.carriers.length > 50 && (
          <p className="mt-2 text-center text-xs text-gray-400">
            +{roster.carriers.length - 50} more carriers
          </p>
        )}
      </div>
    </section>
  );
}
