"use client";

import { useState } from "react";

type SearchResult = {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  statusCode: string | null;
  compositeScore: number;
  chameleonScore: number;
  clusterSize: number;
};

function scoreBadge(score: number) {
  if (score >= 70)
    return "rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-300";
  if (score >= 30)
    return "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300";
  return "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300";
}

export function CarrierSearch({
  onSelect,
}: {
  onSelect: (dot: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chameleon/search?q=${encodeURIComponent(query.trim())}&sort=risk&limit=20`
      );
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="text-lg font-semibold text-white">Search Carriers</h3>
      <form onSubmit={handleSearch} className="mt-3 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="DOT number or company name..."
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 placeholder:text-slate-500 focus:ring"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {total > 0 && (
        <p className="mt-2 text-xs text-slate-400">{total} results found</p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 max-h-[400px] space-y-1 overflow-y-auto">
          {results.map((r) => (
            <li key={r.dotNumber}>
              <button
                onClick={() => onSelect(r.dotNumber)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-slate-800/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {r.legalName}
                  </p>
                  <p className="text-xs text-slate-400">
                    DOT {r.dotNumber}
                    {r.statusCode && (
                      <span className="ml-2 text-slate-500">
                        {r.statusCode}
                      </span>
                    )}
                    {r.clusterSize > 1 && (
                      <span className="ml-2 text-blue-400">
                        cluster:{r.clusterSize}
                      </span>
                    )}
                  </p>
                </div>
                <span className={scoreBadge(r.compositeScore)}>
                  {r.compositeScore.toFixed(0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
