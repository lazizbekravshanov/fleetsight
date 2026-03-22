"use client";

import { useState, useEffect } from "react";

const REPORT_TYPES = [
  { value: "double_brokering", label: "Double Brokering" },
  { value: "cargo_theft", label: "Cargo Theft" },
  { value: "no_show", label: "No Show" },
  { value: "payment_failure", label: "Payment Failure" },
  { value: "safety_concern", label: "Safety Concern" },
  { value: "fraud", label: "Fraud" },
];

type ReportSummary = {
  totalReports12m: number;
  reportsByType: Record<string, number>;
  communityScore: number;
  isFlagged: boolean;
  lastReportAt: string | null;
};

type MyReport = {
  id: string;
  reportType: string;
  createdAt: string;
};

export function ReportsTab({ dotNumber }: { dotNumber: string }) {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/carrier/${dotNumber}/reports`)
        .then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/carrier/${dotNumber}/reports/mine`)
        .then((r) => (r.ok ? r.json() : { reports: [] })),
    ])
      .then(([summaryData, mineData]) => {
        if (summaryData) setSummary(summaryData);
        setMyReports(mineData?.reports ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dotNumber]);

  async function submitReport() {
    if (!selectedType || description.length < 10 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const r = await fetch(`/api/carrier/${dotNumber}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: selectedType, description }),
      });
      if (r.ok) {
        setSubmitSuccess(true);
        setSelectedType("");
        setDescription("");
        // Refresh data
        const [newSummary, newMine] = await Promise.all([
          fetch(`/api/carrier/${dotNumber}/reports`).then((r) => r.ok ? r.json() : null),
          fetch(`/api/carrier/${dotNumber}/reports/mine`).then((r) => r.ok ? r.json() : { reports: [] }),
        ]);
        if (newSummary) setSummary(newSummary);
        setMyReports(newMine?.reports ?? []);
      } else {
        const err = await r.json().catch(() => ({ error: "Failed to submit report" }));
        setSubmitError(err.error ?? "Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Which types are on cooldown (user already reported within 30 days)
  const cooldownTypes = new Set(myReports.map((r) => r.reportType));

  return (
    <div className="space-y-4">
      {/* Submit Report */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Submit a Report
        </label>
        <p className="mb-3 text-xs text-gray-400">
          Reports are anonymous to other users. Limit: 1 report per type per carrier every 30 days.
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REPORT_TYPES.map((rt) => {
            const onCooldown = cooldownTypes.has(rt.value);
            return (
              <button
                key={rt.value}
                onClick={() => !onCooldown && setSelectedType(rt.value)}
                disabled={onCooldown}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  selectedType === rt.value
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                    : onCooldown
                      ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                {rt.label}
                {onCooldown && <span className="ml-1 text-[10px]">(reported)</span>}
              </button>
            );
          })}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the incident (minimum 10 characters)..."
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-400">{description.length}/2000</span>
          <button
            onClick={submitReport}
            disabled={!selectedType || description.length < 10 || submitting}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>

        {submitError && (
          <p className="mt-2 text-xs text-rose-600">{submitError}</p>
        )}
        {submitSuccess && (
          <p className="mt-2 text-xs text-emerald-600">Report submitted successfully.</p>
        )}
      </div>

      {/* Aggregate Stats */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading reports...</div>
      ) : !summary || summary.totalReports12m === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">No community reports for this carrier.</p>
          <p className="mt-1 text-xs text-gray-400">Be the first to submit a report if you have concerns.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Community Reports</h3>
            {summary.isFlagged && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
                FLAGGED
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalReports12m}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Reports (12mo)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.communityScore}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Risk Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(summary.reportsByType).length}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Report Types</p>
            </div>
          </div>

          {Object.keys(summary.reportsByType).length > 0 && (
            <div className="mt-4 space-y-1">
              {Object.entries(summary.reportsByType).map(([type, count]) => {
                const label = REPORT_TYPES.find((rt) => rt.value === type)?.label ?? type;
                return (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

          {summary.lastReportAt && (
            <p className="mt-3 text-[10px] text-gray-400">
              Last report: {new Date(summary.lastReportAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
