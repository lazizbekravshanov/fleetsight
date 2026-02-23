import type { SocrataCarrier } from "@/lib/socrata";
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
  peerBenchmark,
  onSwitchToSafety,
}: {
  carrier: SocrataCarrier;
  authority: unknown;
  oos: unknown;
  basics: unknown;
  inspections: { length: number; oosTotal: number };
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
            <Row
              label="MCS-150 Date"
              value={new Date(c.mcs150_date).toLocaleDateString()}
            />
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
          inspectionCount={inspections.length}
          oosTotal={inspections.oosTotal}
        />
      )}

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
  inspectionCount,
  oosTotal,
}: {
  carrier: SocrataCarrier;
  benchmark: PeerBenchmark;
  inspectionCount: number;
  oosTotal: number;
}) {
  const carrierPU = parseInt(carrier.power_units ?? "0", 10);
  const carrierDrivers = parseInt(carrier.total_drivers ?? "0", 10);
  const carrierOosRate = inspectionCount > 0 ? (oosTotal / inspectionCount) * 100 : 0;

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
    {
      label: "OOS Rate",
      carrier: carrierOosRate,
      avg: benchmark.avgOosRate,
      format: (v: number) => `${v.toFixed(1)}%`,
      invertColor: true,
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
          const isGood = m.invertColor ? !above : above;
          return (
            <div key={m.label} className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-100 font-medium">{m.format(m.carrier)}</span>
                <span className="text-slate-600">vs</span>
                <span className="text-slate-400">{m.format(m.avg)} avg</span>
                <span className={isGood ? "text-emerald-400" : "text-rose-400"}>
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
