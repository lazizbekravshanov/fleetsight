"use client";

import { useState, Fragment } from "react";

export type ViolationRow = {
  code: string;
  description: string;
  oos: boolean;
  basic: string;
  section: string;
  group: string;
};

export type InspectionWithViolations = {
  inspectionId: string;
  date: string;
  state: string;
  level: string;
  violations: ViolationRow[];
};

export function ViolationDrillDown({ inspections }: { inspections: InspectionWithViolations[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (inspections.length === 0) return null;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Date</th>
            <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>State</th>
            <th className="px-3 py-2 text-left font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Level</th>
            <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>Violations</th>
            <th className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>OOS</th>
            <th className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}></th>
          </tr>
        </thead>
        <tbody>
          {inspections.slice(0, 25).map((insp) => {
            const isExpanded = expanded.has(insp.inspectionId);
            const oosCount = insp.violations.filter((v) => v.oos).length;
            return (
              <Fragment key={insp.inspectionId}>
                <tr
                  style={{ background: "var(--surface-1)", cursor: insp.violations.length > 0 ? "pointer" : undefined }}
                  onClick={() => insp.violations.length > 0 && toggle(insp.inspectionId)}
                >
                  <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{insp.date}</td>
                  <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{insp.state}</td>
                  <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{insp.level}</td>
                  <td className="px-3 py-2 text-right" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-soft)" }}>{insp.violations.length}</td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ borderBottom: "1px solid var(--border)", color: oosCount > 0 ? "#dc2626" : "var(--ink-soft)" }}>{oosCount}</td>
                  <td className="px-3 py-2 text-right" style={{ borderBottom: "1px solid var(--border)", color: "var(--ink-muted)" }}>
                    {insp.violations.length > 0 && (isExpanded ? "▼" : "▶")}
                  </td>
                </tr>
                {isExpanded && insp.violations.map((v, vi) => (
                  <tr key={vi} style={{ background: "var(--surface-2)" }}>
                    <td colSpan={6} className="px-6 py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        {v.oos && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(220,38,38,0.12)", color: "#991b1b" }}>OOS</span>}
                        <span className="font-mono text-[10px]" style={{ color: "var(--ink-muted)" }}>{v.code}</span>
                        <span style={{ color: "var(--ink-soft)" }}>{v.description}</span>
                        {v.basic && <span className="ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{v.basic}</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {inspections.length > 25 && (
        <p className="px-3 py-2 text-center text-[10px]" style={{ color: "var(--ink-muted)", borderTop: "1px solid var(--border)" }}>
          Showing 25 of {inspections.length} inspections with violations.
        </p>
      )}
    </div>
  );
}

