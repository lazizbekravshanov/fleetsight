"use client";

import { useState, useEffect } from "react";

type AffiliationRow = {
  id: string;
  carrierA: { dotNumber: number; legalName: string | null; statusCode: string | null };
  carrierB: { dotNumber: number; legalName: string | null; statusCode: string | null };
  sharedVinCount: number;
  affiliationScore: number;
  affiliationType: string;
  flagged: boolean;
  firstDetectedAt: string;
};

const TYPE_STYLES: Record<string, string> = {
  POSSIBLE_CHAMELEON: "bg-rose-50 text-rose-700",
  COMMON_OWNER: "bg-amber-50 text-amber-700",
  COMMON_EQUIPMENT: "bg-blue-50 text-blue-700",
  UNKNOWN: "bg-gray-50 text-gray-500",
};

const TYPE_LABELS: Record<string, string> = {
  POSSIBLE_CHAMELEON: "Possible Chameleon",
  COMMON_OWNER: "Common Owner",
  COMMON_EQUIPMENT: "Shared Equipment",
  UNKNOWN: "Unknown",
};

export function AffiliationsExplorer() {
  const [rows, setRows] = useState<AffiliationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: "50",
      ...(minScore > 0 ? { minScore: String(minScore) } : {}),
      ...(typeFilter ? { type: typeFilter } : {}),
    });

    fetch(`/api/affiliations?${params}`)
      .then((r) => (r.ok ? r.json() : { affiliations: [], total: 0, page: 1, pages: 1 }))
      .then((data) => {
        setRows(data.affiliations ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, typeFilter, minScore]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <label className="text-xs font-semibold text-gray-500">Filter:</label>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
        >
          <option value="">All Types</option>
          <option value="POSSIBLE_CHAMELEON">Possible Chameleon</option>
          <option value="COMMON_OWNER">Common Owner</option>
          <option value="COMMON_EQUIPMENT">Shared Equipment</option>
        </select>
        <select
          value={minScore}
          onChange={(e) => { setMinScore(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-700"
        >
          <option value={0}>Any Score</option>
          <option value={10}>10+</option>
          <option value={30}>30+</option>
          <option value={60}>60+ (High Risk)</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{total} pairs found</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading affiliations...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500">No carrier affiliations found.</p>
            <p className="mt-1 text-xs text-gray-400">
              Import VIN data to detect shared vehicles between carriers.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2 text-left">Carrier A</th>
                <th className="px-4 py-2 text-left">Carrier B</th>
                <th className="px-4 py-2 text-center">Shared VINs</th>
                <th className="px-4 py-2 text-center">Score</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Detected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <a href={`/?dot=${row.carrierA.dotNumber}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {row.carrierA.legalName ?? `DOT ${row.carrierA.dotNumber}`}
                    </a>
                    <p className="text-[10px] text-gray-400">DOT {row.carrierA.dotNumber}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <a href={`/?dot=${row.carrierB.dotNumber}`} className="font-medium text-gray-900 hover:text-indigo-600">
                      {row.carrierB.legalName ?? `DOT ${row.carrierB.dotNumber}`}
                    </a>
                    <p className="text-[10px] text-gray-400">DOT {row.carrierB.dotNumber}</p>
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-gray-900">
                    {row.sharedVinCount}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-semibold tabular-nums ${
                      row.affiliationScore >= 60 ? "text-rose-600" :
                      row.affiliationScore >= 30 ? "text-amber-600" : "text-gray-600"
                    }`}>
                      {row.affiliationScore}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      TYPE_STYLES[row.affiliationType] ?? TYPE_STYLES.UNKNOWN
                    }`}>
                      {TYPE_LABELS[row.affiliationType] ?? row.affiliationType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {new Date(row.firstDetectedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-400">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
