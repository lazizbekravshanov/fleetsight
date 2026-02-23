import type { SocrataInsurance, SocrataAuthorityHistory, SocrataComplaint } from "@/lib/socrata";
import { Stat } from "../shared";

export function InsuranceTab({
  insurance,
  authorityHistory,
  complaints,
  isHazmat,
}: {
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  complaints: SocrataComplaint[];
  isHazmat: boolean;
}) {
  return (
    <div className="space-y-6">
      <InsuranceCoverage insurance={insurance} isHazmat={isHazmat} />
      <AuthorityTimeline history={authorityHistory} />
      <ComplaintSection complaints={complaints} />
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
  const active = insurance.filter(
    (i) => (i.status ?? "").toUpperCase() === "A"
  );

  // Group by type
  const groups = new Map<string, SocrataInsurance[]>();
  for (const ins of active) {
    const type = ins.ins_type || "Other";
    const existing = groups.get(type) || [];
    existing.push(ins);
    groups.set(type, existing);
  }

  const typeLabels: Record<string, string> = {
    BIPD: "Bodily Injury & Property Damage",
    CARGO: "Cargo Insurance",
    BOND: "Surety Bond",
    "BMC-84": "Surety Bond (BMC-84)",
    "BMC-85": "Trust Fund (BMC-85)",
  };

  // Compliance check
  const bipdPolicies = active.filter(
    (i) => (i.ins_type ?? "").toUpperCase().includes("BIPD") || (i.ins_type ?? "").toUpperCase().includes("BI/PD")
  );
  const maxBipd = bipdPolicies.reduce(
    (max, p) => Math.max(max, parseInt(p.coverage_value ?? "0", 10) || 0),
    0
  );
  const requiredBipd = isHazmat ? 5_000_000 : 750_000;
  const bipdCompliant = maxBipd >= requiredBipd;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Insurance Coverage
        {active.length > 0 && (
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

      {active.length === 0 ? (
        <p className="text-sm text-slate-500 tracking-wide">
          No active insurance records found.
        </p>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([type, policies]) => (
            <div key={type} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                {typeLabels[type.toUpperCase()] || type}
              </p>
              {policies.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400 mb-1">
                  <span>
                    Coverage:{" "}
                    <span className="text-slate-100 font-medium">
                      ${parseInt(p.coverage_value ?? "0", 10).toLocaleString()}
                    </span>
                  </span>
                  {p.insurer_name && (
                    <span>
                      Insurer: <span className="text-slate-300">{p.insurer_name}</span>
                    </span>
                  )}
                  {p.policy_effective_date && (
                    <span>
                      Effective:{" "}
                      <span className="text-slate-300">
                        {new Date(p.policy_effective_date).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                  {p.policy_cancellation_date && (
                    <span>
                      Cancellation:{" "}
                      <span className="text-slate-300">
                        {new Date(p.policy_cancellation_date).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              ))}
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
    (h) => (h.auth_action_desc ?? "").toUpperCase().includes("REVOK")
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
            const action = (h.auth_action_desc ?? "").toUpperCase();
            const isGrant = action.includes("GRANT");
            const isRevoke = action.includes("REVOK");
            const dotColor = isGrant
              ? "bg-emerald-400"
              : isRevoke
                ? "bg-rose-400"
                : "bg-amber-400";

            return (
              <div key={i} className="relative">
                <div
                  className={`absolute -left-[1.85rem] top-1 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-slate-900`}
                />
                <div className="text-xs">
                  <p className="text-slate-200 font-medium">
                    {h.auth_action_desc || "Unknown Action"}
                  </p>
                  <div className="flex flex-wrap gap-x-4 text-slate-400 mt-0.5">
                    {h.action_date && (
                      <span>{new Date(h.action_date).toLocaleDateString()}</span>
                    )}
                    {h.auth_type_desc && <span>{h.auth_type_desc}</span>}
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

/* ── Consumer Complaints ──────────────────────────────────────── */

function ComplaintSection({ complaints }: { complaints: SocrataComplaint[] }) {
  // Group by category
  const categories = new Map<string, number>();
  for (const c of complaints) {
    const cat = c.complaint_category || "Other";
    categories.set(cat, (categories.get(cat) || 0) + 1);
  }
  const sortedCats = [...categories.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
        Consumer Complaints
      </h3>

      {complaints.length === 0 ? (
        <p className="text-sm text-slate-500 tracking-wide">
          No consumer complaints on file.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-4">
            <Stat label="Total Complaints" value={complaints.length} />
            {sortedCats.slice(0, 2).map(([cat, count]) => (
              <Stat key={cat} label={cat} value={count} />
            ))}
          </div>

          <div className="max-h-[24rem] overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="hidden px-3 py-2 sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
                  >
                    <td className="px-3 py-2 whitespace-nowrap">
                      {c.complaint_date
                        ? new Date(c.complaint_date).toLocaleDateString()
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2">
                      {c.complaint_category || "\u2014"}
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell text-slate-400">
                      {c.status || "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
