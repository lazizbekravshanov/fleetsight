"use client";

import { useState } from "react";
import Link from "next/link";

type BulkResult = {
  dotNumber: string;
  legalName: string | null;
  usdotStatus: string | null;
  authorityStatus: string | null;
  powerUnits: number | null;
  phyState: string | null;
  riskGrade: "A" | "B" | "C" | "D" | "F" | null;
  riskScore: number | null;
  error?: string;
};

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  B: "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20",
  C: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  D: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
  F: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
};

const STATUS_STYLES: Record<string, string> = {
  AUTHORIZED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  "OUT-OF-SERVICE": "bg-rose-100 text-rose-800 font-bold",
  "NOT AUTHORIZED": "bg-rose-50 text-rose-700",
  "NONE ACTIVE": "bg-gray-100 text-gray-600",
};

export default function BulkScreeningPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseDots(raw: string): string[] {
    // Accept newline/comma/space/tab separated DOT numbers
    return raw
      .split(/[\n,\s\t]+/)
      .map((s) => s.trim().replace(/^0+/, "") || "0")
      .filter((s) => /^\d{1,10}$/.test(s));
  }

  async function screen() {
    const dots = parseDots(input);
    if (dots.length === 0) {
      setError("No valid DOT numbers found. Enter numeric USDOT numbers, one per line.");
      return;
    }
    if (dots.length > 50) {
      setError("Maximum 50 carriers per screening. Please split into smaller batches.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    try {
      const r = await fetch("/api/carrier/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dotNumbers: dots }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${r.status}`);
      }
      const { results: data } = await r.json();
      setResults(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!results) return;
    const header = ["DOT Number", "Legal Name", "USDOT Status", "Auth Status", "Power Units", "State", "Risk Grade", "Risk Score"];
    const rows = results.map((r) => [
      r.dotNumber,
      r.legalName ?? "Not found",
      r.usdotStatus ?? "—",
      r.authorityStatus ?? "—",
      r.powerUnits ?? "—",
      r.phyState ?? "—",
      r.riskGrade ?? "—",
      r.riskScore ?? "—",
    ]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fleetsight-bulk-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sorted = results?.slice().sort((a, b) => {
    // Sort by risk score ascending (worst first), then errors last
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (a.riskScore ?? 100) - (b.riskScore ?? 100);
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13L5 8l5-5" />
            </svg>
            Dashboard
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">FleetSight</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Bulk Carrier Screening</h1>
          <p className="mt-1 text-sm text-gray-500">Screen up to 50 carriers at once by USDOT number.</p>
        </header>

        {/* Input */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            USDOT Numbers
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"123456\n789012\n345678"}
            rows={8}
            className="w-full resize-y rounded-lg border border-gray-200 p-3 font-mono text-sm text-gray-900 placeholder-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            One per line. Also accepts comma or space separated. Max 50 per batch.
          </p>
          {error && (
            <p className="mt-2 text-sm text-rose-600">{error}</p>
          )}
          <button
            onClick={screen}
            disabled={loading || !input.trim()}
            className="mt-3 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {loading ? "Screening…" : `Screen ${parseDots(input).length > 0 ? parseDots(input).length : ""} Carriers`}
          </button>
        </div>

        {/* Results */}
        {loading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-gray-500">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
            Screening carriers — this may take 10-30 seconds…
          </div>
        )}

        {sorted && sorted.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">{sorted.length} carriers screened</h2>
              <button
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v9M4 8l4 4 4-4" /><path d="M2 13h12" />
                </svg>
                Export CSV
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">DOT #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Carrier Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">USDOT</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Auth</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">State</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Units</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Grade</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sorted.map((r) => (
                    <tr key={r.dotNumber} className={`hover:bg-gray-50 ${r.error ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.dotNumber}</td>
                      <td className="px-4 py-3">
                        {r.legalName ? (
                          <span className="font-medium text-gray-900">{r.legalName}</span>
                        ) : (
                          <span className="italic text-gray-400">{r.error ?? "Not found"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.usdotStatus ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.usdotStatus] ?? "bg-gray-100 text-gray-600"}`}>
                            {r.usdotStatus}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.authorityStatus ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.authorityStatus] ?? "bg-gray-100 text-gray-600"}`}>
                            {r.authorityStatus}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.phyState ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{r.powerUnits ?? "—"}</td>
                      <td className="px-4 py-3">
                        {r.riskGrade ? (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_STYLES[r.riskGrade]}`}>
                            {r.riskGrade}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {r.legalName && (
                          <Link
                            href={`/?dot=${r.dotNumber}`}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
