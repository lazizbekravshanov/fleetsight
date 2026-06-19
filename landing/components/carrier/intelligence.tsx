/* Predictive Intelligence sections for the carrier page.
   Server component (no "use client"): pure presentational rendering of the
   computed CarrierIntelligence. Every value is guarded so a missing/odd field
   degrades to "—" rather than throwing. */

import type { CarrierIntelligence } from "@/lib/intelligence/adapters";
import type { Trajectory } from "@/lib/intelligence/trajectory";
import type { AnomalyResult } from "@/lib/intelligence/anomaly";
import type { Benchmark } from "@/lib/intelligence/benchmarking";
import type { Outlook, OutlookBand } from "@/lib/intelligence/outlook";
import type { ChurnResult } from "@/lib/intelligence/churn";

const cardStyle = { borderColor: "var(--border)", background: "var(--surface-1)" } as const;
const num = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) ? n : null);
const pct = (n: number | null | undefined) => {
  const v = num(n);
  return v === null ? "—" : `${v.toFixed(1)}%`;
};

const BAND_COLOR: Record<OutlookBand, { bg: string; fg: string }> = {
  stable: { bg: "rgba(22,163,74,0.10)", fg: "#15803d" },
  watch: { bg: "rgba(202,138,4,0.12)", fg: "#a16207" },
  elevated: { bg: "rgba(234,88,12,0.12)", fg: "#c2410c" },
  high: { bg: "rgba(220,38,38,0.10)", fg: "#991b1b" },
};

const VERDICT_COLOR: Record<Trajectory["verdict"], string> = {
  improving: "#15803d",
  stable: "var(--ink-soft)",
  deteriorating: "#991b1b",
  insufficient_data: "var(--ink-muted)",
};

const FACTOR_LABELS: Record<string, string> = {
  deteriorating_trajectory: "Deteriorating safety trajectory",
  improving_trajectory: "Improving safety trajectory",
  basic_percentile_critical: "Critical BASIC percentile (≥90)",
  basic_percentile_high: "High BASIC percentile (≥75)",
  recent_fatal_crash: "Recent fatal crash",
  insurer_churn: "Frequent insurer changes / coverage lapses",
  authority_instability: "Operating-authority instability",
  chameleon_signals: "Chameleon-carrier signals",
};

const ANOMALY_LABELS: Record<string, string> = {
  fleet_activity_mismatch: "Fleet size vs inspection activity mismatch",
  inspection_drought: "Inspection drought (possible evasion)",
  insurer_churn: "Frequent insurer changes / coverage lapses",
};

const METRIC_LABELS: Record<Benchmark["rows"][number]["metric"], string> = {
  vehicle_oos: "Vehicle OOS rate",
  driver_oos: "Driver OOS rate",
  crashes_per_power_unit: "Crashes per power unit",
};

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-muted)" }}>
      {children}
    </h3>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;
  const w = 132;
  const h = 30;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = pts[pts.length - 1] > pts[0];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="trend">
      <polyline points={d} fill="none" stroke={rising ? "#991b1b" : "#15803d"} strokeWidth={1.5} />
    </svg>
  );
}

function OutlookCard({ outlook }: { outlook: Outlook }) {
  const band = outlook.band in BAND_COLOR ? outlook.band : "stable";
  const c = BAND_COLOR[band];
  const factors = (outlook.factors ?? []).filter((f) => f.points > 0);
  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <CardTitle>Risk Outlook (6–12 mo)</CardTitle>
      <div className="flex items-baseline gap-3">
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ background: c.bg, color: c.fg }}>
          {band}
        </span>
        <span className="text-2xl font-semibold tabular-nums" style={{ color: c.fg }}>
          {num(outlook.score) ?? "—"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--ink-muted)" }}>/ 100</span>
      </div>
      {factors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {factors.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-xs" style={{ color: "var(--ink-soft)" }}>
              <span>{FACTOR_LABELS[f.label] ?? f.label}</span>
              <span className="tabular-nums" style={{ color: "var(--ink-muted)" }}>+{f.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrajectoryCard({ trajectory }: { trajectory: Trajectory }) {
  const verdict = trajectory.verdict in VERDICT_COLOR ? trajectory.verdict : "insufficient_data";
  const oosSeries = (trajectory.byYear ?? []).filter((y) => y.inspections > 0).map((y) => y.oosRate);
  const delta = num(trajectory.oosRateDelta);
  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <CardTitle>Safety Trajectory</CardTitle>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold capitalize" style={{ color: VERDICT_COLOR[verdict] }}>
          {verdict.replace(/_/g, " ")}
        </span>
        <Sparkline values={oosSeries} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        <Row label="OOS-rate change" value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`} />
        <Row label="Avg gap" value={num(trajectory.avgInspectionGapDays) === null ? "—" : `${Math.round(trajectory.avgInspectionGapDays as number)} d`} />
        <Row label="Last inspection" value={num(trajectory.daysSinceLastInspection) === null ? "—" : `${trajectory.daysSinceLastInspection} d ago`} />
        <Row label="Last crash" value={num(trajectory.daysSinceLastCrash) === null ? "—" : `${trajectory.daysSinceLastCrash} d ago`} />
      </div>
    </div>
  );
}

function BenchmarkCard({ benchmark }: { benchmark: Benchmark }) {
  const rows = benchmark.rows ?? [];
  const cohort = benchmark.cohort;
  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <CardTitle>Peer Benchmark</CardTitle>
      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--ink-muted)" }}>No safety benchmark data.</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.metric} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--ink-soft)" }}>{METRIC_LABELS[r.metric] ?? r.metric}</span>
              <span className="tabular-nums" style={{ color: r.better ? "#15803d" : "#991b1b" }}>
                {pct(r.value)} <span style={{ color: "var(--ink-muted)" }}>vs {pct(r.national)} nat'l</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {benchmark.stateCohort && benchmark.stateCohort.rows.length > 0 && (
        <div className="mt-3 pt-3 text-xs" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="mb-1" style={{ color: "var(--ink-muted)" }}>
            vs {benchmark.stateCohort.state} peers ({benchmark.stateCohort.sampleSize.toLocaleString()} inspections)
          </div>
          {benchmark.stateCohort.rows.map((r) => (
            <div key={r.metric} className="flex items-center justify-between">
              <span style={{ color: "var(--ink-soft)" }}>{METRIC_LABELS[r.metric] ?? r.metric}</span>
              <span className="tabular-nums" style={{ color: r.better ? "#15803d" : "#991b1b" }}>
                {pct(r.value)} <span style={{ color: "var(--ink-muted)" }}>vs {pct(r.cohortAvg)} {benchmark.stateCohort!.state}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {cohort && (
        <div className="mt-3 pt-3 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--ink-soft)" }}>
          <div className="mb-1" style={{ color: "var(--ink-muted)" }}>
            Cohort “{cohort.fleetSizeBand}” · {(cohort.carrierCount ?? 0).toLocaleString()} active peers
          </div>
          <Row label="Power units" value={`${cohort.yourPowerUnits ?? "—"} vs ${(num(cohort.avgPowerUnits) ?? 0).toFixed(1)} avg`} />
          <Row label="Drivers" value={`${cohort.yourDrivers ?? "—"} vs ${(num(cohort.avgDrivers) ?? 0).toFixed(1)} avg`} />
        </div>
      )}
    </div>
  );
}

function AnomalyCard({ anomaly, churn }: { anomaly: AnomalyResult; churn: ChurnResult }) {
  const flags = anomaly.anomalies ?? [];
  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <CardTitle>Behavioral Anomalies</CardTitle>
      {flags.length === 0 ? (
        <p className="text-xs" style={{ color: "#15803d" }}>No behavioral anomalies detected.</p>
      ) : (
        <ul className="space-y-1">
          {flags.map((a) => (
            <li key={a} className="flex items-center gap-2 text-xs" style={{ color: "#991b1b" }}>
              <span aria-hidden>▲</span>
              <span>{ANOMALY_LABELS[a] ?? a}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--ink-soft)" }}>
        <Row label="Insurers seen" value={String(anomaly.insurerCount ?? 0)} />
        <Row label="Insp. last 12 mo" value={String(anomaly.inspectionsLast12mo ?? 0)} />
        {churn.hasData && <Row label="VIN churn" value={`${(num(churn.vinChurnRate) ?? 0).toFixed(0)}% (${churn.vinsChurned}/${churn.vinsTotal})`} />}
        {churn.hasData && <Row label="Driver churn" value={`${(num(churn.driverChurnRate) ?? 0).toFixed(0)}% (${churn.driversChurned}/${churn.driversTotal})`} />}
      </div>
      {!churn.hasData && (
        <p className="mt-2 text-[10px]" style={{ color: "var(--ink-muted)" }}>VIN/driver churn populates as fleet data is ingested.</p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--ink-muted)" }}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function CarrierIntelligenceSections({ intel }: { intel: CarrierIntelligence }) {
  return (
    <section className="rounded-xl border p-6" style={cardStyle}>
      <h2 className="mb-4 text-base font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
        Predictive Intelligence
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <OutlookCard outlook={intel.outlook} />
        <TrajectoryCard trajectory={intel.trajectory} />
        <BenchmarkCard benchmark={intel.benchmark} />
        <AnomalyCard anomaly={intel.anomaly} churn={intel.churn} />
      </div>
      <p className="mt-3 text-[10px]" style={{ color: "var(--ink-muted)" }}>
        Derived analytics — trajectory &amp; anomalies from inspection/crash history, benchmark vs FMCSA national averages,
        outlook is a heuristic forward-risk estimate. Cohort benchmarking &amp; VIN/driver churn arrive as data is ingested.
      </p>
    </section>
  );
}
