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

function RiskBadge({ score }: { score: number }) {
  const cfg =
    score >= 70
      ? { bg: "bg-rose-500/15", text: "text-rose-400", ring: "ring-rose-500/20" }
      : score >= 30
        ? { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-500/20" }
        : { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/20" };

  return (
    <span className={`inline-flex min-w-[32px] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      {score.toFixed(0)}
    </span>
  );
}

export function CarrierSearch({
  onSelect,
  selectedDot,
}: {
  onSelect: (dot: number) => void;
  selectedDot: number | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chameleon/search?q=${encodeURIComponent(query.trim())}&sort=risk&limit=20`
      );
      if (!res.ok) throw new Error(`Search returned ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
      setSearched(true);
    } catch {
      setResults([]);
      setTotal(0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-elevated flex flex-col rounded-2xl p-5">
      {/* Header */}
      <h3 className="text-[13px] font-semibold tracking-tight text-white">
        {searched ? "Search Results" : "Carrier Search"}
      </h3>

      {/* Search field */}
      <form onSubmit={handleSearch} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="DOT number or company name..."
            className="w-full rounded-xl border border-slate-700/60 bg-surface-2/80 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/40 focus:bg-surface-2 focus:ring-2 focus:ring-blue-500/15"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.97] disabled:opacity-50"
        >
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            </svg>
          ) : (
            "Search"
          )}
        </button>
      </form>

      {/* Result count */}
      {searched && (
        <p className="mt-2.5 text-[11px] font-medium text-slate-500">
          {total} {total === 1 ? "result" : "results"} found
        </p>
      )}

      {/* Empty state */}
      {!searched && results.length === 0 && (
        <div className="mt-8 flex flex-col items-center pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/50">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-slate-600">
              <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 7h8M5 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Search any FMCSA carrier
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Enter a company name or USDOT number
          </p>
        </div>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <ul className="mt-3 -mx-2 max-h-[calc(100vh-380px)] min-h-0 space-y-0.5 overflow-y-auto">
          {results.map((r) => {
            const isSelected = r.dotNumber === selectedDot;
            return (
              <li key={r.dotNumber}>
                <button
                  onClick={() => onSelect(r.dotNumber)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "bg-blue-500/10 ring-1 ring-blue-500/25"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${isSelected ? "text-blue-100" : "text-slate-200"}`}>
                      {r.legalName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">DOT {r.dotNumber}</span>
                      {r.statusCode && (
                        <span className={r.statusCode === "A" ? "text-emerald-500" : "text-slate-600"}>
                          {r.statusCode === "A" ? "Active" : r.statusCode === "I" ? "Inactive" : r.statusCode}
                        </span>
                      )}
                      {r.clusterSize > 1 && (
                        <span className="flex items-center gap-0.5 text-purple-400">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2" />
                            <circle cx="2" cy="3" r="1" stroke="currentColor" strokeWidth="0.8" />
                            <circle cx="8" cy="3" r="1" stroke="currentColor" strokeWidth="0.8" />
                          </svg>
                          {r.clusterSize}
                        </span>
                      )}
                    </div>
                  </div>
                  <RiskBadge score={r.compositeScore} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
