"use client";

import { useState, useMemo, useEffect } from "react";
import type { SocrataInspection, SocrataCrash, SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";
import { SkeletonRows } from "../shared";

/* ── Event type ─────────────────────────────────────────────────────── */

type TimelineEvent = {
  date: Date;
  dateStr: string;
  type: "inspection" | "crash" | "insurance" | "authority" | "carrier";
  title: string;
  subtitle: string;
  severity: "normal" | "warning" | "critical" | "success";
};

/* ── Icons per event type ───────────────────────────────────────────── */

const EVENT_ICONS: Record<TimelineEvent["type"], JSX.Element> = {
  inspection: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5 8h6M5 5h6M5 11h4" />
    </svg>
  ),
  crash: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l5.5 3v5c0 3.5-2.5 5.5-5.5 6.5-3-1-5.5-3-5.5-6.5v-5z" /><path d="M8 5v3M8 10.5v.5" />
    </svg>
  ),
  insurance: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.5l5.5 3v5c0 3.5-2.5 5.5-5.5 6.5-3-1-5.5-3-5.5-6.5v-5z" /><path d="M6 8l1.5 1.5L10.5 6" />
    </svg>
  ),
  authority: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2 6h12" /><path d="M5 9h3" />
    </svg>
  ),
  carrier: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h10v8H1z" /><path d="M11 7h3l2 2.5V12h-5V7z" /><circle cx="4" cy="13" r="1.5" /><circle cx="13" cy="13" r="1.5" />
    </svg>
  ),
};

const SEVERITY_COLORS = {
  normal: { dot: "bg-accent", line: "border-accent/20", bg: "bg-[var(--surface-1)]" },
  warning: { dot: "bg-amber-500", line: "border-amber-200", bg: "bg-amber-50" },
  critical: { dot: "bg-rose-500", line: "border-rose-200", bg: "bg-rose-50" },
  success: { dot: "bg-emerald-500", line: "border-emerald-200", bg: "bg-emerald-50" },
};

const TYPE_LABELS: Record<TimelineEvent["type"], string> = {
  inspection: "Inspections",
  crash: "Crashes",
  insurance: "Insurance",
  authority: "Authority",
  carrier: "Carrier",
};

/* ── Component ──────────────────────────────────────────────────────── */

export function TimelineTab({
  dotNumber,
  addDate,
  carrierName,
}: {
  dotNumber: string;
  addDate?: string;
  carrierName?: string;
}) {
  const [inspections, setInspections] = useState<SocrataInspection[] | null>(null);
  const [crashes, setCrashes] = useState<SocrataCrash[] | null>(null);
  const [insurance, setInsurance] = useState<SocrataInsurance[] | null>(null);
  const [authority, setAuthority] = useState<SocrataAuthorityHistory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTypes, setFilterTypes] = useState<Set<TimelineEvent["type"]>>(new Set(["inspection", "crash", "insurance", "authority", "carrier"]));

  useEffect(() => {
    Promise.all([
      fetch(`/api/carrier/${dotNumber}/inspections`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/carrier/${dotNumber}/crashes`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/carrier/${dotNumber}/insurance`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/carrier/${dotNumber}/authority-history`).then((r) => r.ok ? r.json() : null),
    ]).then(([inspData, crashData, insData, authData]) => {
      setInspections(inspData?.inspections ?? []);
      setCrashes(crashData?.crashes ?? []);
      setInsurance(insData?.insurance ?? []);
      setAuthority(authData?.history ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [dotNumber]);

  const events = useMemo(() => {
    const all: TimelineEvent[] = [];

    // Carrier creation
    if (addDate) {
      const d = new Date(addDate);
      if (!isNaN(d.getTime())) {
        all.push({
          date: d,
          dateStr: d.toLocaleDateString(),
          type: "carrier",
          title: "Carrier Registered",
          subtitle: `${carrierName ?? "Carrier"} registered with FMCSA`,
          severity: "success",
        });
      }
    }

    // Inspections
    for (const insp of inspections ?? []) {
      if (!insp.insp_date) continue;
      const d = new Date(insp.insp_date);
      if (isNaN(d.getTime())) continue;
      const viols = parseInt(insp.viol_total ?? "0", 10) || 0;
      const oos = parseInt(insp.oos_total ?? "0", 10) || 0;
      all.push({
        date: d,
        dateStr: d.toLocaleDateString(),
        type: "inspection",
        title: `Inspection — ${insp.report_state ?? "Unknown"}`,
        subtitle: `${viols} violation${viols !== 1 ? "s" : ""}${oos > 0 ? `, ${oos} OOS` : ""}`,
        severity: oos > 0 ? "critical" : viols > 0 ? "warning" : "normal",
      });
    }

    // Crashes
    for (const crash of crashes ?? []) {
      if (!crash.report_date) continue;
      const d = new Date(crash.report_date);
      if (isNaN(d.getTime())) continue;
      const fat = parseInt(crash.fatalities ?? "0", 10) || 0;
      const inj = parseInt(crash.injuries ?? "0", 10) || 0;
      all.push({
        date: d,
        dateStr: d.toLocaleDateString(),
        type: "crash",
        title: `Crash — ${crash.report_state ?? "Unknown"}`,
        subtitle: fat > 0 ? `${fat} fatalities, ${inj} injuries` : inj > 0 ? `${inj} injuries` : "Tow-away",
        severity: fat > 0 ? "critical" : "warning",
      });
    }

    // Insurance
    for (const ins of insurance ?? []) {
      if (!ins.effective_date && !ins.trans_date) continue;
      const dateStr = ins.effective_date ?? ins.trans_date ?? "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const amount = ins.underl_lim_amount ? `$${parseInt(ins.underl_lim_amount, 10).toLocaleString()}` : "";
      all.push({
        date: d,
        dateStr: d.toLocaleDateString(),
        type: "insurance",
        title: `Insurance — ${ins.mod_col_1 ?? "Policy"}`,
        subtitle: `${ins.name_company ?? "Unknown insurer"}${amount ? ` — ${amount}` : ""}`,
        severity: "success",
      });
    }

    // Authority
    for (const auth of authority ?? []) {
      const dateStr = auth.orig_served_date ?? auth.disp_served_date ?? "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const action = auth.original_action_desc ?? auth.disp_action_desc ?? "Change";
      const isRevoked = /revok|suspend|deny/i.test(action);
      all.push({
        date: d,
        dateStr: d.toLocaleDateString(),
        type: "authority",
        title: `Authority ${action}`,
        subtitle: `${auth.mod_col_1 ?? "Operating authority"}${auth.docket_number ? ` — ${auth.docket_number}` : ""}`,
        severity: isRevoked ? "critical" : "success",
      });
    }

    return all.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [inspections, crashes, insurance, authority, addDate, carrierName]);

  const filtered = useMemo(() =>
    events.filter((e) => filterTypes.has(e.type)),
    [events, filterTypes]
  );

  // Year grouping
  const yearGroups = useMemo(() => {
    const groups = new Map<number, TimelineEvent[]>();
    for (const ev of filtered) {
      const year = ev.date.getFullYear();
      const arr = groups.get(year) ?? [];
      arr.push(ev);
      groups.set(year, arr);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  function toggleType(type: TimelineEvent["type"]) {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  if (loading) return <SkeletonRows count={6} />;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(TYPE_LABELS) as TimelineEvent["type"][]).map((type) => {
          const active = filterTypes.has(type);
          const count = events.filter((e) => e.type === type).length;
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent-soft text-accent ring-1 ring-accent/20"
                  : "bg-[var(--surface-2)] text-[var(--ink-muted)]"
              }`}
            >
              {EVENT_ICONS[type]}
              {TYPE_LABELS[type]}
              <span className="ml-0.5 text-[10px]">({count})</span>
            </button>
          );
        })}
        <span className="ml-auto text-xs text-[var(--ink-muted)]">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Summary stats */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink)]">{events.filter((e) => e.severity === "critical").length}</p>
          <p className="text-[10px] text-rose-600">Critical</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink)]">{events.filter((e) => e.severity === "warning").length}</p>
          <p className="text-[10px] text-amber-600">Warning</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink)]">{events.filter((e) => e.severity === "success").length}</p>
          <p className="text-[10px] text-emerald-600">Positive</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-center">
          <p className="text-lg font-bold text-[var(--ink)]">{events.length}</p>
          <p className="text-[10px] text-[var(--ink-muted)]">Total</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-base text-[var(--ink-muted)]">No events found.</p>
      ) : (
        <div className="space-y-8">
          {yearGroups.map(([year, yearEvents]) => (
            <div key={year}>
              {/* Year header */}
              <div className="sticky top-0 z-10 mb-3 flex items-center gap-3">
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">{year}</span>
                <span className="text-[10px] text-[var(--ink-muted)]">{yearEvents.length} event{yearEvents.length !== 1 ? "s" : ""}</span>
                <div className="flex-1 border-t border-[var(--border)]" />
              </div>

              {/* Events */}
              <div className="relative ml-4 border-l-2 border-[var(--border)] pl-6 space-y-3">
                {yearEvents.map((ev, i) => {
                  const colors = SEVERITY_COLORS[ev.severity];
                  return (
                    <div key={`${ev.type}-${i}`} className="relative">
                      {/* Dot on the line */}
                      <div className={`absolute -left-[31px] top-2.5 h-3 w-3 rounded-full ${colors.dot} ring-2 ring-[var(--surface-2)]`} />

                      {/* Card */}
                      <div className={`rounded-lg border border-[var(--border)] ${colors.bg} px-4 py-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[var(--ink-soft)]">{EVENT_ICONS[ev.type]}</span>
                            <span className="text-xs font-medium text-[var(--ink)]">{ev.title}</span>
                          </div>
                          <span className="shrink-0 text-[10px] tabular-nums text-[var(--ink-muted)]">{ev.dateStr}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--ink-soft)] leading-relaxed">{ev.subtitle}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
