import type { SocrataCarrier, SocrataInspection, SocrataCrash, SocrataAuthorityHistory } from "@/lib/socrata";
import {
  decodeStatus,
  decodeOperation,
  decodeFleetSize,
  decodeCarship,
  decodeClassdef,
} from "@/lib/fmcsa-codes";
import { Row, Stat, extractArray, str, parseBasics } from "../shared";
import type { BasicScore, PeerBenchmark } from "../types";

export function OverviewTab({
  carrier: c,
  authority,
  oos,
  basics,
  inspections,
  crashes,
  authorityHistory,
  peerBenchmark,
  onSwitchToSafety,
}: {
  carrier: SocrataCarrier;
  authority: unknown;
  oos: unknown;
  basics: unknown;
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  authorityHistory: SocrataAuthorityHistory[];
  peerBenchmark: PeerBenchmark | null;
  onSwitchToSafety: () => void;
}) {
  const address = [c.phy_street, c.phy_city, c.phy_state, c.phy_zip]
    .filter(Boolean)
    .join(", ");
  const mailingAddress = [
    c.carrier_mailing_street,
    c.carrier_mailing_city,
    c.carrier_mailing_state,
    c.carrier_mailing_zip,
  ]
    .filter(Boolean)
    .join(", ");
  const classifications = decodeClassdef(c.classdef);
  const basicScores = parseBasics(basics);

  // MCS-150 staleness
  const mcs150Staleness = computeMcs150Staleness(c.mcs150_date);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Company Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
          Company Info
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Legal Name" value={c.legal_name} />
          {c.dba_name && <Row label="DBA Name" value={c.dba_name} />}
          {address && <Row label="Physical Address" value={address} />}
          {mailingAddress && mailingAddress !== address && (
            <Row label="Mailing Address" value={mailingAddress} />
          )}
          {c.phone && <Row label="Phone" value={c.phone} />}
          {c.cell_phone && <Row label="Cell Phone" value={c.cell_phone} />}
          {c.fax && <Row label="Fax" value={c.fax} />}
          {c.email_address && <Row label="Email" value={c.email_address} />}
          {c.company_officer_1 && (
            <Row label="Officer 1" value={c.company_officer_1} />
          )}
          {c.company_officer_2 && (
            <Row label="Officer 2" value={c.company_officer_2} />
          )}
          {c.business_org_desc && (
            <Row label="Entity Type" value={c.business_org_desc} />
          )}
          {c.dun_bradstreet_no && (
            <Row label="D&B Number" value={c.dun_bradstreet_no} />
          )}
          {c.add_date && (
            <Row
              label="Operating Since"
              value={new Date(c.add_date).toLocaleDateString()}
            />
          )}
          {c.mcs150_date && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-slate-400">MCS-150 Date</dt>
              <dd className="flex items-center gap-2 text-right text-slate-100">
                {new Date(c.mcs150_date).toLocaleDateString()}
                {mcs150Staleness && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mcs150Staleness.className}`}>
                    {mcs150Staleness.label}
                  </span>
                )}
              </dd>
            </div>
          )}
          {c.mcs150_mileage && (
            <Row
              label="MCS-150 Mileage"
              value={`${parseInt(c.mcs150_mileage, 10).toLocaleString()} mi${c.mcs150_mileage_year ? ` (${c.mcs150_mileage_year})` : ""}`}
            />
          )}
        </dl>
      </div>

      {/* SAFER Stats */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          SAFER Stats
        </h3>
        {/* Interstate/Intrastate/HazMat badges */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {c.interstate === "Y" && (
            <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-medium text-blue-300">Interstate</span>
          )}
          {c.intrastate === "Y" && (
            <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-medium text-purple-300">Intrastate</span>
          )}
          {c.hm_ind === "Y" && (
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-medium text-amber-300">HazMat</span>
          )}
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Status" value={decodeStatus(c.status_code)} />
          <Row
            label="Operation Type"
            value={decodeOperation(c.carrier_operation)}
          />
          {classifications.length > 0 && (
            <Row label="Classification" value={classifications.join(", ")} />
          )}
          <Row label="Fleet Size" value={decodeFleetSize(c.fleetsize)} />
          {c.power_units && <Row label="Power Units" value={c.power_units} />}
          {c.truck_units && <Row label="Trucks" value={c.truck_units} />}
          {c.bus_units && <Row label="Buses" value={c.bus_units} />}
          {c.owntract && <Row label="Owned Tractors" value={c.owntract} />}
          {c.owntrail && <Row label="Owned Trailers" value={c.owntrail} />}
          {c.owntruck && <Row label="Owned Trucks" value={c.owntruck} />}
          {c.total_drivers && (
            <Row label="Total Drivers" value={c.total_drivers} />
          )}
          {c.total_cdl && <Row label="CDL Holders" value={c.total_cdl} />}
          <Row label="Hazmat" value={c.hm_ind === "Y" ? "Yes" : "No"} />
          {c.carship && (
            <Row
              label="Cargo Carried"
              value={decodeCarship(c.carship).join(", ")}
            />
          )}
          {c.docket1 && (
            <Row
              label="Docket"
              value={`${c.docket1prefix ?? ""}${c.docket1}`}
            />
          )}
        </dl>
      </div>

      {/* BASIC Scores Summary */}
      {basicScores.length > 0 && (
        <BasicScoresSummary scores={basicScores} onViewAll={onSwitchToSafety} />
      )}

      {/* Peer Benchmarking */}
      {peerBenchmark && (
        <PeerBenchmarkCard
          carrier={c}
          benchmark={peerBenchmark}
          inspections={inspections}
        />
      )}

      {/* Carrier Timeline */}
      <CarrierTimeline
        inspections={inspections}
        crashes={crashes}
        authorityHistory={authorityHistory}
      />

      {/* State Distribution */}
      <StateDistribution
        inspections={inspections}
        crashes={crashes}
      />

      {/* Authority Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel md:col-span-2">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Authority &amp; Operating Status
        </h3>
        <AuthoritySection authority={authority} oos={oos} />
      </div>
    </div>
  );
}

/* ── MCS-150 Staleness ────────────────────────────────────────── */

function computeMcs150Staleness(mcs150Date?: string) {
  if (!mcs150Date) return null;
  const date = new Date(mcs150Date);
  if (isNaN(date.getTime())) return null;
  const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  if (monthsAgo > 36) {
    return { label: "Overdue", className: "bg-rose-500/20 text-rose-300" };
  }
  if (monthsAgo > 24) {
    return { label: "Due for Update", className: "bg-amber-500/20 text-amber-300" };
  }
  return { label: "Current", className: "bg-emerald-500/20 text-emerald-300" };
}

/* ── BASIC Scores Summary Card ────────────────────────────────── */

function BasicScoresSummary({
  scores,
  onViewAll,
}: {
  scores: BasicScore[];
  onViewAll: () => void;
}) {
  const hasAlert = scores.some((s) => s.rdDeficient);
  const top3 = scores.slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
        BASIC Safety Scores
      </h3>
      {hasAlert && (
        <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          One or more BASICs exceed the intervention threshold
        </div>
      )}
      <div className="space-y-3">
        {top3.map((s) => {
          const color =
            s.percentile > 75
              ? "bg-rose-500"
              : s.percentile > 50
                ? "bg-amber-500"
                : "bg-emerald-500";
          return (
            <div key={s.code || s.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{s.name}</span>
                <span className={`font-medium ${s.rdDeficient ? "text-rose-400" : "text-slate-100"}`}>
                  {s.percentile}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full ${color} transition-all`}
                  style={{ width: `${Math.min(s.percentile, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onViewAll}
        className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        View all safety scores &rarr;
      </button>
    </div>
  );
}

/* ── Peer Benchmarking Card ───────────────────────────────────── */

function PeerBenchmarkCard({
  carrier,
  benchmark,
  inspections,
}: {
  carrier: SocrataCarrier;
  benchmark: PeerBenchmark;
  inspections: SocrataInspection[];
}) {
  const carrierPU = parseInt(carrier.power_units ?? "0", 10);
  const carrierDrivers = parseInt(carrier.total_drivers ?? "0", 10);

  // Only show Power Units and Drivers — OOS Rate removed (census dataset has no OOS data)
  const metrics = [
    {
      label: "Power Units",
      carrier: carrierPU,
      avg: benchmark.avgPowerUnits,
      format: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      label: "Drivers",
      carrier: carrierDrivers,
      avg: benchmark.avgDrivers,
      format: (v: number) => Math.round(v).toLocaleString(),
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
        Peer Comparison
        <span className="ml-auto text-[10px] font-normal normal-case text-slate-600">
          vs {benchmark.carrierCount.toLocaleString()} similar-sized carriers
        </span>
      </h3>
      <div className="space-y-3">
        {metrics.map((m) => {
          const above = m.carrier > m.avg;
          return (
            <div key={m.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-100 font-medium">{m.format(m.carrier)}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-slate-400">{m.format(m.avg)} avg</span>
                <span className={above ? "text-emerald-400" : "text-rose-400"}>
                  {above ? "\u2191" : "\u2193"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Carrier Timeline ─────────────────────────────────────────── */

type TimelineEvent = {
  date: Date;
  type: "inspection" | "crash" | "authority" | "insurance";
  summary: string;
  severity?: "normal" | "warn" | "critical";
};

function CarrierTimeline({
  inspections,
  crashes,
  authorityHistory,
}: {
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  authorityHistory: SocrataAuthorityHistory[];
}) {
  const events: TimelineEvent[] = [];

  for (const insp of inspections) {
    if (!insp.insp_date) continue;
    const viols = parseInt(insp.viol_total ?? "0", 10) || 0;
    const oos = parseInt(insp.oos_total ?? "0", 10) || 0;
    events.push({
      date: new Date(insp.insp_date),
      type: "inspection",
      summary: `Inspection in ${insp.report_state ?? "?"} \u2014 ${viols} violations${oos > 0 ? `, ${oos} OOS` : ""}`,
      severity: oos > 0 ? "warn" : "normal",
    });
  }

  for (const cr of crashes) {
    if (!cr.report_date) continue;
    const fat = parseInt(cr.fatalities ?? "0", 10) || 0;
    const inj = parseInt(cr.injuries ?? "0", 10) || 0;
    events.push({
      date: new Date(cr.report_date),
      type: "crash",
      summary: `Crash in ${cr.report_state ?? "?"}, ${cr.city ?? "unknown"} \u2014 ${fat} fatal, ${inj} injuries`,
      severity: fat > 0 ? "critical" : inj > 0 ? "warn" : "normal",
    });
  }

  for (const ah of authorityHistory) {
    const dateStr = ah.disp_served_date || ah.orig_served_date;
    if (!dateStr) continue;
    const isRevoke = (ah.disp_action_desc ?? "").toUpperCase().includes("REVOK");
    events.push({
      date: new Date(dateStr),
      type: "authority",
      summary: `${ah.original_action_desc ?? "Action"}${ah.disp_action_desc ? ` \u2192 ${ah.disp_action_desc}` : ""}`,
      severity: isRevoke ? "critical" : "normal",
    });
  }

  events.sort((a, b) => b.date.getTime() - a.date.getTime());
  const latest = events.slice(0, 30);

  if (latest.length === 0) {
    return null;
  }

  const typeConfig: Record<string, { color: string; dot: string }> = {
    inspection: { color: "text-blue-400", dot: "bg-blue-400" },
    crash: { color: "text-rose-400", dot: "bg-rose-400" },
    authority: { color: "text-emerald-400", dot: "bg-emerald-400" },
    insurance: { color: "text-amber-400", dot: "bg-amber-400" },
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel md:col-span-2">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
        Carrier Timeline
        <span className="ml-auto text-[10px] font-normal normal-case text-slate-600">
          Latest {latest.length} events
        </span>
      </h3>
      <div className="relative ml-3 border-l border-slate-700 pl-6 space-y-3 max-h-[24rem] overflow-y-auto">
        {latest.map((ev, i) => {
          const cfg = typeConfig[ev.type];
          const severityText =
            ev.severity === "critical"
              ? "text-rose-400"
              : ev.severity === "warn"
                ? "text-amber-400"
                : "text-slate-300";

          return (
            <div key={i} className="relative">
              <div
                className={`absolute -left-[1.85rem] top-1 h-2.5 w-2.5 rounded-full ${cfg.dot} ring-2 ring-slate-900`}
              />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 whitespace-nowrap">
                    {ev.date.toLocaleDateString()}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                    {ev.type}
                  </span>
                </div>
                <p className={`mt-0.5 ${severityText}`}>{ev.summary}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── State Distribution ───────────────────────────────────────── */

function StateDistribution({
  inspections,
  crashes,
}: {
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
}) {
  const stateCounts = new Map<string, { inspections: number; crashes: number }>();

  for (const insp of inspections) {
    if (!insp.report_state) continue;
    const st = insp.report_state.toUpperCase();
    const existing = stateCounts.get(st) || { inspections: 0, crashes: 0 };
    existing.inspections++;
    stateCounts.set(st, existing);
  }

  for (const cr of crashes) {
    if (!cr.report_state) continue;
    const st = cr.report_state.toUpperCase();
    const existing = stateCounts.get(st) || { inspections: 0, crashes: 0 };
    existing.crashes++;
    stateCounts.set(st, existing);
  }

  const sorted = [...stateCounts.entries()]
    .map(([state, counts]) => ({ state, ...counts, total: counts.inspections + counts.crashes }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  if (sorted.length === 0) return null;

  const maxTotal = sorted[0]?.total ?? 1;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
        Geographic Distribution
      </h3>
      <div className="space-y-2">
        {sorted.map(({ state, inspections: insp, crashes: cr, total }) => (
          <div key={state}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-200 font-medium">{state}</span>
              <span className="text-slate-400">{total}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
              {insp > 0 && (
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(insp / maxTotal) * 100}%` }}
                />
              )}
              {cr > 0 && (
                <div
                  className="h-full bg-rose-500"
                  style={{ width: `${(cr / maxTotal) * 100}%` }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Inspections
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Crashes
        </div>
      </div>
    </div>
  );
}

/* ── Authority Section ────────────────────────────────────────── */

function AuthoritySection({
  authority,
  oos,
}: {
  authority: unknown;
  oos: unknown;
}) {
  const authorityRecords = extractArray(authority, "authority");
  const oosRecords = extractArray(oos, "oos");

  if (authorityRecords.length === 0 && oosRecords.length === 0) {
    return (
      <p className="text-sm text-slate-500 tracking-wide">
        Authority data not available. Ensure FMCSA_WEBKEY is configured to
        retrieve operating authority details.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {authorityRecords.length > 0 && (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="px-3 py-2">Authority Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Granted Date</th>
                <th className="hidden px-3 py-2 sm:table-cell">Docket</th>
              </tr>
            </thead>
            <tbody>
              {authorityRecords.map((a, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
                >
                  <td className="px-3 py-2">
                    {str(a.authorityType) || str(a.authTypDesc) || "\u2014"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        str(a.authStatusDesc)?.toUpperCase() === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {str(a.authStatusDesc) || str(a.authStatus) || "\u2014"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {str(a.authGrantDate)
                      ? new Date(str(a.authGrantDate)!).toLocaleDateString()
                      : "\u2014"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {str(a.docketNbr) || str(a.docketPrefix)
                      ? `${str(a.docketPrefix) ?? ""}${str(a.docketNbr) ?? ""}`
                      : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {oosRecords.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Out-of-Service Orders
          </h4>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Effective Date</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {oosRecords.map((o, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
                  >
                    <td className="px-3 py-2">
                      {str(o.oosType) || str(o.oosTypeDesc) || "\u2014"}
                    </td>
                    <td className="px-3 py-2">
                      {str(o.oosDate) || str(o.effectiveDate)
                        ? new Date(
                            (str(o.oosDate) || str(o.effectiveDate))!
                          ).toLocaleDateString()
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {str(o.oosReason) || str(o.oosReasonDesc) || "\u2014"}
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
