import type { SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";

export function InsuranceTab({
  insurance,
  authorityHistory,
  isHazmat,
}: {
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  isHazmat: boolean;
}) {
  return (
    <div className="space-y-6">
      <InsuranceCoverage insurance={insurance} isHazmat={isHazmat} />
      <AuthorityTimeline history={authorityHistory} />
    </div>
  );
}

/* ── Insurance Coverage Cards ─────────────────────────────────── */

function InsuranceCoverage({
  insurance,
  isHazmat,
}: {
  insurance: SocrataInsurance[];
  isHazmat: boolean;
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Insurance &amp; Bonds
        {insurance.length > 0 && bipdPolicies.length > 0 && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
              bipdCompliant
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {bipdCompliant ? "BIPD Compliant" : "BIPD Below Minimum"}
          </span>
        )}
      </h3>

      {insurance.length === 0 ? (
        <p className="text-sm text-slate-500 tracking-wide">
          No insurance or bond records found.
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([type, policies]) => (
            <div key={type} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                {typeLabels[type.toUpperCase()] || type}
              </p>
              {policies.map((p, i) => {
                const coverage = parseInt(p.max_cov_amount ?? "0", 10) || parseInt(p.underl_lim_amount ?? "0", 10) || 0;
                return (
                  <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400 mb-1">
                    {coverage > 0 && (
                      <span>
                        Coverage:{" "}
                        <span className="text-slate-100 font-medium">
                          ${coverage.toLocaleString()}
                        </span>
                      </span>
                    )}
                    {p.name_company && (
                      <span>
                        Company: <span className="text-slate-300">{p.name_company}</span>
                      </span>
                    )}
                    {p.policy_no && (
                      <span>
                        Policy: <span className="text-slate-300">{p.policy_no}</span>
                      </span>
                    )}
                    {p.effective_date && (
                      <span>
                        Effective: <span className="text-slate-300">{p.effective_date}</span>
                      </span>
                    )}
                    {p.docket_number && (
                      <span>
                        Docket: <span className="text-slate-300">{p.docket_number}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {!bipdCompliant && bipdPolicies.length > 0 && (
            <p className="text-xs text-rose-400">
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        Authority History
        {hasChameleonPattern && (
          <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-medium text-rose-300">
            {revocations.length} Revocations
          </span>
        )}
      </h3>

      {history.length === 0 ? (
        <p className="text-sm text-slate-500 tracking-wide">
          No authority history records found.
        </p>
      ) : (
        <div className="relative ml-3 border-l border-slate-700 pl-6 space-y-4">
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

            return (
              <div key={i} className="relative">
                <div
                  className={`absolute -left-[1.85rem] top-1 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-slate-900`}
                />
                <div className="text-xs">
                  <p className="text-slate-200 font-medium">
                    {h.original_action_desc || "Unknown Action"}
                    {h.disp_action_desc && (
                      <span className="text-rose-400 ml-2">&rarr; {h.disp_action_desc}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-slate-400 mt-0.5">
                    {h.mod_col_1 && <span>{h.mod_col_1}</span>}
                    {h.orig_served_date && (
                      <span>Granted: {h.orig_served_date}</span>
                    )}
                    {h.disp_served_date && (
                      <span>Disposed: {h.disp_served_date}</span>
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
