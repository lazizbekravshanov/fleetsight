"use client";

import { useEffect, useState } from "react";

type AnomalyFlag = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  detail: string;
};

type SignalsData = {
  anomalyFlags: AnomalyFlag[];
  authorityMill: {
    grantCount: number;
    revokeCount: number;
    avgDaysBetween: number;
    isMillPattern: boolean;
  };
  brokerReincarnation: {
    priorDot: number | null;
    addressMatch: boolean;
    phoneMatch: boolean;
    officerMatch: boolean;
    isReincarnation: boolean;
  };
  sharedInsurance: {
    policyNumber: string;
    insurerName: string;
    matchingDots: number[];
  }[];
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

type CarrierData = {
  carrier: {
    dotNumber: number;
    legalName: string;
    dbaName: string | null;
    phyStreet: string | null;
    phyCity: string | null;
    phyState: string | null;
    phyZip: string | null;
    phone: string | null;
    statusCode: string | null;
    priorRevokeFlag: string | null;
    priorRevokeDot: number | null;
    addDate: string | null;
    powerUnits: number | null;
    totalDrivers: number | null;
    companyOfficer1: string | null;
    companyOfficer2: string | null;
  };
  riskScore: {
    chameleonScore: number;
    safetyScore: number;
    compositeScore: number;
    signals: string[];
    clusterSize: number;
  } | null;
  crashes: {
    reportDate: string | null;
    reportNumber: string | null;
    state: string | null;
    fatalities: number;
    injuries: number;
    towAway: boolean;
  }[];
  links: {
    otherDotNumber: number;
    otherLegalName: string;
    otherStatusCode: string | null;
    score: number;
    reasons: { feature: string; value: string; contribution: number }[];
  }[];
  clusterMembers: {
    dotNumber: number;
    legalName: string;
    statusCode: string | null;
  }[];
};

function RiskGauge({ score, label }: { score: number; label: string }) {
  const angle = (score / 100) * 180 - 90;
  const color =
    score >= 70
      ? "#f43f5e"
      : score >= 30
        ? "#f59e0b"
        : "#10b981";
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="h-16 w-28">
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="#334155"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 157} 157`}
        />
        <line
          x1="60"
          y1="60"
          x2={60 + 35 * Math.cos((angle * Math.PI) / 180)}
          y2={60 - 35 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="60" cy="60" r="3" fill={color} />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill={color}
        >
          {score.toFixed(0)}
        </text>
      </svg>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function CarrierDetail({
  dotNumber,
  onSelectDot,
}: {
  dotNumber: number;
  onSelectDot: (dot: number) => void;
}) {
  const [data, setData] = useState<CarrierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signals, setSignals] = useState<SignalsData | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSignals(null);
    fetch(`/api/chameleon/carriers/${dotNumber}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed to load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dotNumber]);

  useEffect(() => {
    if (!data) return;
    setSignalsLoading(true);
    fetch(`/api/chameleon/carriers/${dotNumber}/signals`)
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => setSignals(d))
      .catch(() => {})
      .finally(() => setSignalsLoading(false));
  }, [data, dotNumber]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-slate-300">
        Loading carrier detail...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
        {error || "Carrier not found"}
      </div>
    );
  }

  const { carrier, riskScore, crashes, links, clusterMembers } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-blue-300">
              DOT {carrier.dotNumber}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {carrier.legalName}
            </h2>
            {carrier.dbaName && (
              <p className="text-sm text-slate-400">DBA: {carrier.dbaName}</p>
            )}
            <p className="mt-1 text-sm text-slate-300">
              {[carrier.phyStreet, carrier.phyCity, carrier.phyState, carrier.phyZip]
                .filter(Boolean)
                .join(", ")}
            </p>
            {carrier.phone && (
              <p className="text-sm text-slate-400">Phone: {carrier.phone}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {carrier.statusCode && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                  {carrier.statusCode}
                </span>
              )}
              {carrier.priorRevokeFlag === "Y" && (
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-rose-300">
                  Prior Revoke
                </span>
              )}
              {carrier.powerUnits != null && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                  {carrier.powerUnits} units
                </span>
              )}
              {carrier.totalDrivers != null && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                  {carrier.totalDrivers} drivers
                </span>
              )}
            </div>
          </div>

          {/* Risk gauges */}
          {riskScore && (
            <div className="flex gap-4">
              <RiskGauge
                score={riskScore.compositeScore}
                label="Composite"
              />
              <RiskGauge
                score={riskScore.chameleonScore}
                label="Chameleon"
              />
              <RiskGauge score={riskScore.safetyScore} label="Safety" />
            </div>
          )}
        </div>

        {/* Signals */}
        {riskScore && riskScore.signals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Risk Signals
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {riskScore.signals.map((s) => (
                <span
                  key={s}
                  className="rounded bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Officers */}
      {(carrier.companyOfficer1 || carrier.companyOfficer2) && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">Company Officers</h3>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {carrier.companyOfficer1 && <p>{carrier.companyOfficer1}</p>}
            {carrier.companyOfficer2 && <p>{carrier.companyOfficer2}</p>}
          </div>
        </div>
      )}

      {/* Detection Signals */}
      {signalsLoading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">
          Analyzing detection signals...
        </div>
      )}

      {signals && signals.anomalyFlags.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">
            Anomaly Flags ({signals.anomalyFlags.length})
          </h3>
          <div className="mt-3 space-y-2">
            {signals.anomalyFlags.map((flag) => (
              <div
                key={flag.id}
                className={`rounded-lg border px-3 py-2 ${SEVERITY_STYLES[flag.severity] ?? SEVERITY_STYLES.low}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase">
                    {flag.severity}
                  </span>
                  <span className="text-sm font-medium">{flag.label}</span>
                </div>
                <p className="mt-0.5 text-xs opacity-80">{flag.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {signals?.authorityMill.isMillPattern && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5">
          <h3 className="text-sm font-semibold text-orange-300">
            Authority Mill Pattern Detected
          </h3>
          <div className="mt-2 grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="text-lg font-bold text-orange-300">
                {signals.authorityMill.grantCount}
              </p>
              <p className="text-slate-400">Grants</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-300">
                {signals.authorityMill.revokeCount}
              </p>
              <p className="text-slate-400">Revocations</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-300">
                {signals.authorityMill.avgDaysBetween}
              </p>
              <p className="text-slate-400">Avg Days/Cycle</p>
            </div>
          </div>
        </div>
      )}

      {signals?.brokerReincarnation.isReincarnation && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <h3 className="text-sm font-semibold text-rose-300">
            Broker Reincarnation Detected
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Matches prior DOT on multiple fields — possible re-registration under new identity.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {signals.brokerReincarnation.priorDot && (
              <button
                onClick={() => onSelectDot(signals.brokerReincarnation.priorDot!)}
                className="rounded bg-rose-500/20 px-2 py-1 text-rose-300 transition hover:bg-rose-500/30"
              >
                Prior DOT: {signals.brokerReincarnation.priorDot}
              </button>
            )}
            {signals.brokerReincarnation.addressMatch && (
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                Address Match
              </span>
            )}
            {signals.brokerReincarnation.phoneMatch && (
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                Phone Match
              </span>
            )}
            {signals.brokerReincarnation.officerMatch && (
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                Officer Match
              </span>
            )}
          </div>
        </div>
      )}

      {signals && signals.sharedInsurance.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="text-sm font-semibold text-amber-300">
            Shared Insurance ({signals.sharedInsurance.length} policies)
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Other carriers share the same insurance policies — potential chameleon signal.
          </p>
          <div className="mt-3 space-y-2">
            {signals.sharedInsurance.map((si) => (
              <div
                key={si.policyNumber}
                className="rounded-lg border border-slate-700 px-3 py-2"
              >
                <p className="text-xs text-slate-300">
                  <span className="font-medium text-amber-300">
                    {si.policyNumber}
                  </span>
                  {" — "}
                  {si.insurerName}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {si.matchingDots.map((dot) => (
                    <button
                      key={dot}
                      onClick={() => onSelectDot(dot)}
                      className="rounded bg-slate-800 px-2 py-0.5 text-xs text-blue-400 transition hover:bg-slate-700"
                    >
                      DOT {dot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Carriers */}
      {links.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">
            Linked Carriers ({links.length})
          </h3>
          <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
            {links.map((link) => (
              <button
                key={link.otherDotNumber}
                onClick={() => onSelectDot(link.otherDotNumber)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-800/60"
              >
                <div>
                  <span className="text-slate-100">
                    {link.otherLegalName}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">
                    DOT {link.otherDotNumber}
                  </span>
                  <div className="mt-0.5 flex gap-1">
                    {link.reasons.slice(0, 3).map((r, i) => (
                      <span
                        key={i}
                        className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400"
                      >
                        {r.feature}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-400">
                  {link.score.toFixed(1)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crashes */}
      {crashes.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">
            Crash History ({crashes.length})
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">State</th>
                  <th className="pb-2 pr-4">Fatal</th>
                  <th className="pb-2 pr-4">Injuries</th>
                  <th className="pb-2">Tow</th>
                </tr>
              </thead>
              <tbody>
                {crashes.slice(0, 20).map((c, i) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-1.5 pr-4">
                      {c.reportDate
                        ? new Date(c.reportDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-1.5 pr-4">{c.state || "—"}</td>
                    <td className="py-1.5 pr-4">
                      {c.fatalities > 0 ? (
                        <span className="text-rose-400">{c.fatalities}</span>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="py-1.5 pr-4">{c.injuries}</td>
                    <td className="py-1.5">{c.towAway ? "Y" : "N"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cluster Members */}
      {clusterMembers.length > 1 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="text-sm font-semibold text-white">
            Cluster Members ({clusterMembers.length})
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {clusterMembers.map((m) => (
              <button
                key={m.dotNumber}
                onClick={() => onSelectDot(m.dotNumber)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition hover:bg-slate-800/60 ${
                  m.dotNumber === dotNumber
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-300"
                    : "border-slate-700 text-slate-300"
                }`}
              >
                {m.legalName}
                <span className="ml-1 text-slate-500">({m.dotNumber})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
