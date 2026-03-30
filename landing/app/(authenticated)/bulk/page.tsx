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
  A: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30",
  B: "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-400 dark:ring-teal-500/30",
  C: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30",
  D: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 dark:bg-orange-950/40 dark:text-orange-400 dark:ring-orange-500/30",
  F: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-500/30",
};

const STATUS_STYLES: Record<string, string> = {
  AUTHORIZED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  ACTIVE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  "OUT-OF-SERVICE": "bg-rose-100 text-rose-800 font-bold dark:bg-rose-950/40 dark:text-rose-400",
  "NOT AUTHORIZED": "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400",
  "NONE ACTIVE": "bg-[var(--surface-2)] text-[var(--ink-soft)]",
};

export default function BulkScreeningPage() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseDots(raw: string): string[] {
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
      r.usdotStatus ?? "\u2014",
      r.authorityStatus ?? "\u2014",
      r.powerUnits ?? "\u2014",
      r.phyState ?? "\u2014",
      r.riskGrade ?? "\u2014",
      r.riskScore ?? "\u2014",
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
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    return (a.riskScore ?? 100) - (b.riskScore ?? 100);
  });

  return (
    <div>
      <p className="mb-6 text-sm" style={{ color: "var(--ink-soft)" }}>
        Screen up to 50 carriers at once by USDOT number.
      </p>

      {/* Input */}
      <div className="rounded-xl p-5 shadow-sm" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>
          USDOT Numbers
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"123456\n789012\n345678"}
          rows={8}
          className="w-full resize-y rounded-lg p-3 font-mono text-sm placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border)" }}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
          One per line. Also accepts comma or space separated. Max 50 per batch.
        </p>
        {error && (
          <p className="mt-2 text-sm text-rose-500">{error}</p>
        )}
        <button
          onClick={screen}
          disabled={loading || !input.trim()}
          className="mt-3 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {loading ? "Screening\u2026" : `Screen ${parseDots(input).length > 0 ? parseDots(input).length : ""} Carriers`}
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-6 flex items-center gap-3 text-sm" style={{ color: "var(--ink-soft)" }}>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          Screening carriers \u2014 this may take 10-30 seconds\u2026
        </div>
      )}

      {sorted && sorted.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>{sorted.length} carriers screened</h2>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:opacity-80"
              style={{ background: "var(--surface-1)", color: "var(--ink-soft)", border: "1px solid var(--border)" }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v9M4 8l4 4 4-4" /><path d="M2 13h12" />
              </svg>
              Export CSV
            </button>
          </div>

          <div className="overflow-hidden rounded-xl shadow-sm" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface-2)" }}>
                <tr>
                  {["DOT #", "Carrier Name", "USDOT", "Auth", "State", "Units", "Grade", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-soft)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {sorted.map((r) => (
                  <tr
                    key={r.dotNumber}
                    className={`transition-colors hover:bg-[var(--surface-2)] ${r.error ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--ink-soft)" }}>{r.dotNumber}</td>
                    <td className="px-4 py-3">
                      {r.legalName ? (
                        <span className="font-medium" style={{ color: "var(--ink)" }}>{r.legalName}</span>
                      ) : (
                        <span className="italic" style={{ color: "var(--ink-muted)" }}>{r.error ?? "Not found"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.usdotStatus ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.usdotStatus] ?? "bg-[var(--surface-2)] text-[var(--ink-soft)]"}`}>
                          {r.usdotStatus}
                        </span>
                      ) : <span style={{ color: "var(--ink-muted)" }}>\u2014</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.authorityStatus ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.authorityStatus] ?? "bg-[var(--surface-2)] text-[var(--ink-soft)]"}`}>
                          {r.authorityStatus}
                        </span>
                      ) : <span style={{ color: "var(--ink-muted)" }}>\u2014</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{r.phyState ?? "\u2014"}</td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{r.powerUnits ?? "\u2014"}</td>
                    <td className="px-4 py-3">
                      {r.riskGrade ? (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${GRADE_STYLES[r.riskGrade]}`}>
                          {r.riskGrade}
                        </span>
                      ) : <span style={{ color: "var(--ink-muted)" }}>\u2014</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.legalName && (
                        <Link
                          href={`/?dot=${r.dotNumber}`}
                          className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
                        >
                          View \u2192
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
  );
}
