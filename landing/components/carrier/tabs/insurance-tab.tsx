"use client";

import type { SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";
import { ExportButton, SkeletonRows, downloadCsv } from "../shared";
import type { CsvColumn } from "../shared";

export function InsuranceTab({
  insurance,
  authorityHistory,
  isHazmat,
  loading,
  error,
}: {
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  isHazmat: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  if (loading) {
    return <SkeletonRows count={3} />;
  }

  if (error) {
    return (
      <p className="py-12 text-center text-sm text-rose-600">{error}</p>
    );
  }
  const csvColumns: CsvColumn<Record<string, unknown>>[] = [
    { key: "mod_col_1", header: "Type" },
    { key: "name_company", header: "Company" },
    { key: "policy_no", header: "Policy #" },
    { key: "max_cov_amount", header: "Max Coverage" },
    { key: "underl_lim_amount", header: "Underlying Limit" },
    { key: "effective_date", header: "Effective Date" },
    { key: "trans_date", header: "Transaction Date" },
    { key: "docket_number", header: "Docket" },
  ];

  return (
    <div className="space-y-6">
      <InsuranceCoverage
        insurance={insurance}
        isHazmat={isHazmat}
        onExport={() => downloadCsv(insurance as unknown as Record<string, unknown>[], csvColumns, "insurance.csv")}
      />
      <AuthorityTimeline history={authorityHistory} />
    </div>
  );
}

/* ── Insurance Coverage Cards ─────────────────────────────────── */

function InsuranceCoverage({
  insurance,
  isHazmat,
  onExport,
}: {
  insurance: SocrataInsurance[];
  isHazmat: boolean;
  onExport: () => void;
}) {
  // Group by type (mod_col_1)
  const groups = new Map<string, SocrataInsurance[]>();
  for (const ins of insurance) {
    const type = ins.mod_col_1 || ins.ins_form_code || "Other";
    const existing = groups.get(type) || [];
    existing.push(ins);
    groups.set(type, existing);
  }

  // Check BIPD compliance
  const bipdPolicies = insurance.filter((i) => {
    const type = (i.mod_col_1 ?? "").toUpperCase();
    return type.includes("BIPD") || type.includes("LIABILITY") || type.includes("BI/PD");
  });
  const maxBipd = bipdPolicies.reduce((max, p) => {
    const val = parseInt(p.max_cov_amount ?? "0", 10) || parseInt(p.underl_lim_amount ?? "0", 10) || 0;
    return Math.max(max, val);
  }, 0);
  const requiredBipd = isHazmat ? 5_000_000 : 750_000;
  const bipdCompliant = maxBipd >= requiredBipd;

  const typeLabels: Record<string, string> = {
    SURETY: "Surety Bond",
    "BIPD LIABILITY": "Bodily Injury & Property Damage",
    CARGO: "Cargo Insurance",
    TRUST: "Trust Fund",
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Insurance &amp; Bonds
        {insurance.length > 0 && bipdPolicies.length > 0 && (
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              bipdCompliant
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
            }`}
          >
            {bipdCompliant ? "BIPD Compliant" : "BIPD Below Minimum"}
          </span>
        )}
        {insurance.length > 0 && (
          <ExportButton onClick={onExport} />
        )}
      </h3>

      {insurance.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)] tracking-wide">
          No insurance or bond records found.
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([type, policies]) => (
            <div key={type} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">
                {typeLabels[type.toUpperCase()] || type}
              </p>
              {policies.map((p, i) => {
                const coverage = parseInt(p.max_cov_amount ?? "0", 10) || parseInt(p.underl_lim_amount ?? "0", 10) || 0;
                return (
                  <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--ink-soft)] mb-1">
                    {coverage > 0 && (
                      <span>
                        Coverage:{" "}
                        <span className="text-[var(--ink)] font-medium">
                          ${coverage.toLocaleString()}
                        </span>
                      </span>
                    )}
                    {p.name_company && (
                      <span>
                        Company: <span className="text-[var(--ink-soft)]">{p.name_company}</span>
                      </span>
                    )}
                    {p.policy_no && (
                      <span>
                        Policy: <span className="text-[var(--ink-soft)]">{p.policy_no}</span>
                      </span>
                    )}
                    {p.effective_date && (
                      <span>
                        Effective: <span className="text-[var(--ink-soft)]">{p.effective_date}</span>
                      </span>
                    )}
                    {p.trans_date && (
                      <span>
                        Transaction: <span className="text-[var(--ink-soft)]">{p.trans_date}</span>
                      </span>
                    )}
                    {p.docket_number && (
                      <span>
                        Docket: <span className="text-[var(--ink-soft)]">{p.docket_number}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {!bipdCompliant && bipdPolicies.length > 0 && (
            <p className="text-xs text-rose-600">
              BIPD coverage (${maxBipd.toLocaleString()}) is below the{" "}
              {isHazmat ? "$5,000,000 hazmat" : "$750,000"} minimum.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Authority History Timeline ───────────────────────────────── */

function AuthorityTimeline({ history }: { history: SocrataAuthorityHistory[] }) {
  const revocations = history.filter(
    (h) => (h.disp_action_desc ?? "").toUpperCase().includes("REVOK")
  );
  const hasChameleonPattern = revocations.length >= 2;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Authority History
        {hasChameleonPattern && (
          <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
            {revocations.length} Revocations
          </span>
        )}
      </h3>

      {history.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)] tracking-wide">
          No authority history records found.
        </p>
      ) : (
        <div className="relative ml-3 border-l border-gray-300 pl-6 space-y-4">
          {history.map((h, i) => {
            const origAction = (h.original_action_desc ?? "").toUpperCase();
            const dispAction = (h.disp_action_desc ?? "").toUpperCase();
            const isGrant = origAction.includes("GRANT") && !dispAction;
            const isRevoke = dispAction.includes("REVOK");
            const dotColor = isRevoke
              ? "bg-rose-400"
              : isGrant
                ? "bg-emerald-400"
                : "bg-amber-400";

            // Compute gap between decided and served dates
            let gapDays: number | null = null;
            if (h.disp_decided_date && h.disp_served_date) {
              const decided = new Date(h.disp_decided_date);
              const served = new Date(h.disp_served_date);
              const diff = served.getTime() - decided.getTime();
              if (!isNaN(diff)) {
                gapDays = Math.round(diff / (1000 * 60 * 60 * 24));
              }
            }

            return (
              <div key={i} className="relative">
                <div
                  className={`absolute -left-[1.85rem] top-1 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-white`}
                />
                <div className="text-xs">
                  <p className="text-[var(--ink-soft)] font-medium">
                    {h.original_action_desc || "Unknown Action"}
                    {h.disp_action_desc && (
                      <span className="text-rose-600 ml-2">&rarr; {h.disp_action_desc}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-[var(--ink-soft)] mt-0.5">
                    {h.mod_col_1 && <span>{h.mod_col_1}</span>}
                    {h.sub_number && <span>Sub#: {h.sub_number}</span>}
                    {h.orig_served_date && (
                      <span>Granted: {h.orig_served_date}</span>
                    )}
                    {h.disp_decided_date && (
                      <span>Decided: {h.disp_decided_date}</span>
                    )}
                    {h.disp_served_date && (
                      <span>Disposed: {h.disp_served_date}</span>
                    )}
                    {gapDays !== null && gapDays > 0 && (
                      <span className="text-amber-600">({gapDays}d gap)</span>
                    )}
                    {h.docket_number && <span>Docket: {h.docket_number}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
