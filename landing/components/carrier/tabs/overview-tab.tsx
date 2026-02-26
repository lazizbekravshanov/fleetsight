import type { SocrataCarrier, SocrataInspection, SocrataCrash, SocrataAuthorityHistory } from "@/lib/socrata";
import {
  decodeStatus,
  decodeOperation,
  decodeFleetSize,
  decodeCarship,
  decodeClassdef,
} from "@/lib/fmcsa-codes";
import { Row, extractArray, str, parseBasics } from "../shared";
import type { BasicScore, PeerBenchmark, VoipResult, SosResult, RiskScore, FmcsaStatus } from "../types";
import { computeRiskScore } from "@/lib/risk-score";

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
  onSwitchTab,
  voip,
  sosResult,
  affiliatedCarriers,
  fmcsaStatus,
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
  onSwitchTab?: (tab: string) => void;
  voip?: VoipResult;
  sosResult?: SosResult;
  affiliatedCarriers?: { dotNumber: string; legalName: string; statusCode?: string }[];
  fmcsaStatus?: FmcsaStatus | null;
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

  // Contact recency
  const contactRecency = computeContactRecency(c.mcs150_date, c.add_date);

  // Authority age
  const authorityAge = computeAuthorityAge(c.add_date);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Risk Summary Card */}
      <RiskSummaryCard
        basics={basics}
        inspections={inspections}
        crashes={crashes}
        oos={oos}
        authorityHistory={authorityHistory}
        carrier={c}
        voip={voip}
        sosResult={sosResult}
        onSwitchTab={onSwitchTab}
      />

      {/* Company Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
          Company Info
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Legal Name" value={c.legal_name} />
          {c.dba_name && <Row label="DBA Name" value={c.dba_name} />}
          {address && <Row label="Physical Address" value={address} />}
          {mailingAddress && mailingAddress !== address && (
            <Row label="Mailing Address" value={mailingAddress} />
          )}
          {c.phone && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">Phone</dt>
              <dd className="flex items-center gap-2 text-right text-gray-900">
                {c.phone}
                {voip?.isLikelyVoip && (
                  <span
                    className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20"
                    title={voip.reason ?? "Likely VoIP number"}
                  >
                    VoIP
                  </span>
                )}
              </dd>
            </div>
          )}
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
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">Operating Since</dt>
              <dd className="flex items-center gap-2 text-right text-gray-900">
                {new Date(c.add_date).toLocaleDateString()}
                {authorityAge.badge && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${authorityAge.badge.className}`}>
                    {authorityAge.badge.label}
                  </span>
                )}
                {authorityAge.formatted && !authorityAge.badge && (
                  <span className="text-xs text-gray-400">({authorityAge.formatted})</span>
                )}
              </dd>
            </div>
          )}
          {c.mcs150_date && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">Contact Last Verified</dt>
              <dd className="flex items-center gap-2 text-right text-gray-900">
                {new Date(c.mcs150_date).toLocaleDateString()}
                {contactRecency.staleness && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${contactRecency.staleness.className}`}>
                    {contactRecency.staleness.label}
                  </span>
                )}
              </dd>
            </div>
          )}
          {contactRecency.isSuspicious && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {contactRecency.suspicionReason}
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
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          SAFER Stats
        </h3>
        {/* Interstate/Intrastate/HazMat badges */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {c.interstate === "Y" && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-600/20">Interstate</span>
          )}
          {c.intrastate === "Y" && (
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-purple-600/20">Intrastate</span>
          )}
          {c.hm_ind === "Y" && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-600/20">HazMat</span>
          )}
        </div>
        <dl className="space-y-2 text-sm">
          {fmcsaStatus?.usdotStatus ? (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">USDOT Status</dt>
              <dd className="flex items-center gap-2 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    fmcsaStatus.usdotStatus.toUpperCase() === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                  }`}
                >
                  {fmcsaStatus.usdotStatus}
                </span>
                <span className="text-[10px] text-gray-400">FMCSA</span>
              </dd>
            </div>
          ) : (
            <Row label="USDOT Status" value={decodeStatus(c.status_code)} />
          )}
          {fmcsaStatus?.operatingAuthorityStatus && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-gray-500">Operating Authority</dt>
              <dd className="flex items-center gap-2 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    fmcsaStatus.operatingAuthorityStatus === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                  }`}
                >
                  {fmcsaStatus.operatingAuthorityStatus}
                </span>
                <span className="text-[10px] text-gray-400">FMCSA</span>
              </dd>
            </div>
          )}
          {fmcsaStatus?.hasActiveOos && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              Active Out-of-Service Order
            </div>
          )}
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

      {/* Secretary of State / Business Registration */}
      {sosResult && (
        <SosCard sosResult={sosResult} />
      )}

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
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
          Authority &amp; Operating Status
        </h3>
        <AuthoritySection authority={authority} oos={oos} />
      </div>

      {/* Related Carriers */}
      {affiliatedCarriers && affiliatedCarriers.length > 0 && (
        <RelatedCarriersCard carriers={affiliatedCarriers} onSwitchTab={onSwitchTab} />
      )}
    </div>
  );
}

/* ── Risk Summary Card with Circular Score Badge ─────────────── */

const GRADE_COLORS: Record<string, { stroke: string; text: string; bg: string }> = {
  A: { stroke: "stroke-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  B: { stroke: "stroke-emerald-400", text: "text-emerald-600", bg: "bg-emerald-50" },
  C: { stroke: "stroke-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  D: { stroke: "stroke-orange-500", text: "text-orange-700", bg: "bg-orange-50" },
  F: { stroke: "stroke-rose-500", text: "text-rose-700", bg: "bg-rose-50" },
};

function CircularScoreBadge({ score, grade }: { score: number; grade: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = GRADE_COLORS[grade] ?? GRADE_COLORS.C;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx="44" cy="44" r={radius}
          fill="none"
          className={colors.stroke}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform="rotate(-90 44 44)"
        />
        <text
          x="44" y="38"
          textAnchor="middle"
          className={`text-2xl font-bold ${colors.text}`}
          fill="currentColor"
          dominantBaseline="middle"
        >
          {grade}
        </text>
        <text
          x="44" y="56"
          textAnchor="middle"
          className="text-[10px] text-gray-400"
          fill="currentColor"
          dominantBaseline="middle"
        >
          {score}/100
        </text>
      </svg>
    </div>
  );
}

type RiskLevel = "critical" | "elevated" | "low";

function RiskSummaryCard({
  basics,
  inspections,
  crashes,
  oos,
  authorityHistory,
  carrier,
  voip,
  sosResult,
  onSwitchTab,
}: {
  basics: unknown;
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  oos: unknown;
  authorityHistory: SocrataAuthorityHistory[];
  carrier: SocrataCarrier;
  voip?: VoipResult;
  sosResult?: SosResult;
  onSwitchTab?: (tab: string) => void;
}) {
  const basicScores = parseBasics(basics);
  const oosRecords = extractArray(oos, "oos");

  // Compute full risk score
  const riskResult: RiskScore = computeRiskScore({
    basicScores,
    inspections,
    crashes,
    oosRecords,
    authorityHistory,
    mcs150Date: carrier.mcs150_date,
    addDate: carrier.add_date,
    insurance: [], // insurance loaded lazily, not available on overview initial load
    powerUnits: carrier.power_units ? parseInt(carrier.power_units, 10) : undefined,
    totalDrivers: carrier.total_drivers ? parseInt(carrier.total_drivers, 10) : undefined,
    isHazmat: carrier.hm_ind === "Y",
    isVoip: voip?.isLikelyVoip,
    sosMatchQuality: sosResult?.matchQuality,
  });

  // 1. BASIC Risk
  const basicsAbove75 = basicScores.filter((s) => s.percentile > 75).length;

  // 2. Inspection Risk — OOS rate
  const totalInsp = inspections.length;
  const oosCount = inspections.reduce(
    (s, i) => s + (parseInt(i.oos_total ?? "0", 10) > 0 ? 1 : 0),
    0
  );
  const oosRate = totalInsp > 0 ? (oosCount / totalInsp) * 100 : 0;

  // 3. Crash Risk — severity score
  const totalFatalities = crashes.reduce(
    (s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0),
    0
  );
  const severityScore =
    totalFatalities * 3 +
    crashes.reduce((s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0), 0) * 2 +
    crashes.reduce((s, c) => s + (parseInt(c.tow_away ?? "0", 10) || 0), 0);

  // 4. Authority Risk
  const activeOos = oosRecords.length > 0;
  const revocations = authorityHistory.filter(
    (h) => (h.disp_action_desc ?? "").toUpperCase().includes("REVOK")
  );

  // 5. Data Freshness
  const mcs150 = computeMcs150Staleness(carrier.mcs150_date);

  // Overall risk level
  let riskLevel: RiskLevel = "low";
  if (totalFatalities > 0 || basicsAbove75 >= 2 || activeOos) {
    riskLevel = "critical";
  } else if (basicsAbove75 >= 1 || oosRate > 10 || severityScore > 5) {
    riskLevel = "elevated";
  }

  const riskConfig: Record<RiskLevel, { label: string; border: string; bg: string; text: string }> = {
    critical: { label: "Critical Risk", border: "border-l-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
    elevated: { label: "Elevated Risk", border: "border-l-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    low: { label: "Low Risk", border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  };

  const cfg = riskConfig[riskLevel];

  type Signal = { label: string; value: string; color: string; tab?: string };
  const signals: Signal[] = [
    {
      label: "BASIC Alerts",
      value: basicsAbove75 > 0 ? `${basicsAbove75} above 75%` : "None",
      color: basicsAbove75 >= 2 ? "bg-rose-500" : basicsAbove75 === 1 ? "bg-amber-500" : "bg-emerald-500",
      tab: "safety",
    },
    {
      label: "OOS Rate",
      value: totalInsp > 0 ? `${oosRate.toFixed(1)}%` : "N/A",
      color: oosRate > 10 ? "bg-rose-500" : oosRate > 5.5 ? "bg-amber-500" : "bg-emerald-500",
      tab: "inspections",
    },
    {
      label: "Crash Severity",
      value: String(severityScore),
      color: totalFatalities > 0 ? "bg-rose-500" : severityScore > 5 ? "bg-amber-500" : "bg-emerald-500",
      tab: "crashes",
    },
    {
      label: "Authority",
      value: activeOos ? "OOS Active" : revocations.length > 0 ? `${revocations.length} revocations` : "Clear",
      color: activeOos ? "bg-rose-500" : revocations.length > 0 ? "bg-amber-500" : "bg-emerald-500",
    },
    ...(mcs150
      ? [{
          label: "MCS-150",
          value: mcs150.label,
          color: mcs150.label === "Overdue" ? "bg-rose-500" : mcs150.label === "Due for Update" ? "bg-amber-500" : "bg-emerald-500",
        }]
      : []),
  ];

  return (
    <div className={`md:col-span-2 rounded-xl border border-gray-200 border-l-4 ${cfg.border} bg-white p-5 shadow-sm`}>
      <div className="flex items-start gap-4 mb-4">
        <CircularScoreBadge score={riskResult.score} grade={riskResult.grade} />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">Composite risk score: {riskResult.score}/100</span>
          </div>
          {/* Top risk factors */}
          <div className="space-y-1">
            {riskResult.factors
              .filter((f) => f.value > 0)
              .slice(0, 3)
              .map((f) => (
                <div key={f.category} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    f.severity === "critical" ? "bg-rose-500" : f.severity === "elevated" ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                  <span className="text-gray-600">{f.detail}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {signals.map((sig) => (
          <button
            key={sig.label}
            onClick={() => sig.tab && onSwitchTab?.(sig.tab)}
            disabled={!sig.tab}
            className={`flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs transition ${
              sig.tab ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"
            }`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${sig.color}`} />
            <div>
              <p className="text-gray-500">{sig.label}</p>
              <p className="font-medium text-gray-900">{sig.value}</p>
            </div>
          </button>
        ))}
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
    return { label: "Overdue", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20" };
  }
  if (monthsAgo > 24) {
    return { label: "Due for Update", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" };
  }
  return { label: "Current", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" };
}

/* ── Contact Recency ──────────────────────────────────────────── */

function computeContactRecency(mcs150Date?: string, addDate?: string) {
  const staleness = computeMcs150Staleness(mcs150Date);

  let isSuspicious = false;
  let suspicionReason: string | null = null;

  if (mcs150Date && addDate) {
    const mcsDate = new Date(mcs150Date);
    const authDate = new Date(addDate);
    if (!isNaN(mcsDate.getTime()) && !isNaN(authDate.getTime())) {
      const mcsMonths = (Date.now() - mcsDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const authDays = (Date.now() - authDate.getTime()) / (1000 * 60 * 60 * 24);
      if (mcsMonths > 24 && authDays < 180) {
        isSuspicious = true;
        suspicionReason = "New authority with overdue MCS-150 — contact info may be unverified";
      }
    }
  }

  return { lastVerified: mcs150Date, staleness, isSuspicious, suspicionReason };
}

/* ── Authority Age ────────────────────────────────────────────── */

function computeAuthorityAge(addDate?: string) {
  if (!addDate) return { days: null, formatted: null, badge: null };
  const date = new Date(addDate);
  if (isNaN(date.getTime())) return { days: null, formatted: null, badge: null };
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days < 90) {
    return {
      days,
      formatted: `${days} days`,
      badge: { label: "New Authority", className: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20" },
    };
  }
  if (days < 180) {
    return {
      days,
      formatted: `${Math.floor(days / 30)} months`,
      badge: { label: "Recent Authority", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20" },
    };
  }

  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return {
    days,
    formatted: years > 0 ? `${years}y ${months}m` : `${months} months`,
    badge: null,
  };
}

/* ── Secretary of State Card ──────────────────────────────────── */

function SosCard({ sosResult }: { sosResult: SosResult }) {
  const matchColors = {
    exact: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    partial: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    none: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
  };

  const matchLabels = {
    exact: "Exact Match",
    partial: "Partial Match",
    none: "No Match Found",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
        Business Registration
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="shrink-0 text-gray-500">Match Status</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${matchColors[sosResult.matchQuality]}`}>
            {matchLabels[sosResult.matchQuality]}
          </span>
        </div>
        {sosResult.registeredName && (
          <Row label="Registered Name" value={sosResult.registeredName} />
        )}
        {sosResult.registrationStatus && (
          <Row label="Registration Status" value={sosResult.registrationStatus} />
        )}
        {sosResult.jurisdiction && (
          <Row label="Jurisdiction" value={sosResult.jurisdiction.toUpperCase()} />
        )}
        {sosResult.opencorporatesUrl && (
          <div className="pt-1">
            <a
              href={sosResult.opencorporatesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              View on OpenCorporates &rarr;
            </a>
          </div>
        )}
        {sosResult.matchQuality === "none" && (
          <p className="text-xs text-gray-400">
            No matching business registration found in state records.
            This may indicate an unregistered entity.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Related Carriers Card ────────────────────────────────────── */

function RelatedCarriersCard({
  carriers,
  onSwitchTab,
}: {
  carriers: { dotNumber: string; legalName: string; statusCode?: string }[];
  onSwitchTab?: (tab: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
        Related Carriers
        <span className="ml-auto text-[10px] font-normal normal-case text-gray-400">
          {carriers.length} carrier{carriers.length !== 1 ? "s" : ""} at same address
        </span>
      </h3>
      <div className="space-y-1">
        {carriers.slice(0, 10).map((c) => (
          <div
            key={c.dotNumber}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
          >
            <div>
              <span className="font-medium text-gray-900">{c.legalName}</span>
              <span className="ml-2 text-gray-400">DOT {c.dotNumber}</span>
            </div>
            {c.statusCode && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  c.statusCode === "A"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                }`}
              >
                {c.statusCode === "A" ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        ))}
      </div>
      {onSwitchTab && (
        <button
          onClick={() => onSwitchTab("detection")}
          className="mt-3 text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          View detection analysis &rarr;
        </button>
      )}
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
        BASIC Safety Scores
      </h3>
      {hasAlert && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
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
                <span className="text-gray-700">{s.name}</span>
                <span className={`font-medium ${s.rdDeficient ? "text-rose-600" : "text-gray-900"}`}>
                  {s.percentile}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
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
        className="mt-3 text-xs text-indigo-600 hover:text-indigo-500 transition-colors"
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
        Peer Comparison
        <span className="ml-auto text-[10px] font-normal normal-case text-gray-400">
          vs {benchmark.carrierCount.toLocaleString()} similar-sized carriers
        </span>
      </h3>
      <div className="space-y-3">
        {metrics.map((m) => {
          const above = m.carrier > m.avg;
          return (
            <div key={m.label} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{m.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-medium">{m.format(m.carrier)}</span>
                <span className="text-gray-400">vs</span>
                <span className="text-gray-500">{m.format(m.avg)} avg</span>
                <span className={above ? "text-emerald-600" : "text-rose-600"}>
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
    inspection: { color: "text-indigo-600", dot: "bg-indigo-600" },
    crash: { color: "text-rose-600", dot: "bg-rose-600" },
    authority: { color: "text-emerald-600", dot: "bg-emerald-600" },
    insurance: { color: "text-amber-600", dot: "bg-amber-600" },
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-600" />
        Carrier Timeline
        <span className="ml-auto text-[10px] font-normal normal-case text-gray-400">
          Latest {latest.length} events
        </span>
      </h3>
      <div className="relative ml-3 border-l border-gray-300 pl-6 space-y-3 max-h-[24rem] overflow-y-auto">
        {latest.map((ev, i) => {
          const cfg = typeConfig[ev.type];
          const severityText =
            ev.severity === "critical"
              ? "text-rose-600"
              : ev.severity === "warn"
                ? "text-amber-600"
                : "text-gray-700";

          return (
            <div key={i} className="relative">
              <div
                className={`absolute -left-[1.85rem] top-1 h-2.5 w-2.5 rounded-full ${cfg.dot} ring-2 ring-white`}
              />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 whitespace-nowrap">
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" />
        Geographic Distribution
      </h3>
      <div className="space-y-2">
        {sorted.map(({ state, inspections: insp, crashes: cr, total }) => (
          <div key={state}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 font-medium">{state}</span>
              <span className="text-gray-400">{total}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-200">
              {insp > 0 && (
                <div
                  className="h-full bg-indigo-500"
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
      <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
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
      <p className="text-sm text-gray-400 tracking-wide">
        Authority data not available. Ensure FMCSA_WEBKEY is configured to
        retrieve operating authority details.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {authorityRecords.length > 0 && (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-200 text-gray-500">
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
                  className="border-b border-gray-100 transition hover:bg-gray-50 even:bg-gray-50/50"
                >
                  <td className="px-3 py-2">
                    {str(a.authorityType) || str(a.authTypDesc) || "\u2014"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        str(a.authStatusDesc)?.toUpperCase() === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
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
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Out-of-Service Orders
          </h4>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Effective Date</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {oosRecords.map((o, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 transition hover:bg-gray-50 even:bg-gray-50/50"
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
                    <td className="px-3 py-2 text-gray-400">
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
