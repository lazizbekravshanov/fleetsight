"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";
import type { SocrataInspection, SocrataCrash, SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";
import { BADGE_COLORS } from "./shared";
import { OverviewTab } from "./tabs/overview-tab";
import { SafetyTab } from "./tabs/safety-tab";
import { InspectionsTab } from "./tabs/inspections-tab";
import { CrashesTab } from "./tabs/crashes-tab";
import { InsuranceTab } from "./tabs/insurance-tab";
import { FleetTab } from "./tabs/fleet-tab";
import { DetectionTab } from "./tabs/detection-tab";
import { BackgroundTab } from "./tabs/background-tab";
import { NotesTab } from "./tabs/notes-tab";
import { ReportsTab } from "./tabs/reports-tab";
import { AffiliationsTab } from "./tabs/affiliations-tab";
import { VulnerabilityTab } from "./tabs/vulnerability-tab";
import { CostImpactTab } from "./tabs/cost-impact-tab";
import { DriverScorecardTab } from "./tabs/driver-scorecard-tab";
import { EnforcementTab } from "./tabs/enforcement-tab";
import { EnablerWarningPanel } from "../enablers/enabler-risk-badge";
import { ViolationSparkline, type MonthlyViolationData } from "./violation-sparkline";
import type { CarrierDetail, Tab, FleetData, DetectionData, BackgroundData, FmcsaStatus, AffiliationsData, FleetVulnerabilityReport, CostImpactReport, DriverScorecardData, HeatmapData, CarrierEnablersData } from "./types";

const SAFETY_RATING_COLORS: Record<string, string> = {
  Satisfactory: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  Conditional: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  Unsatisfactory: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
};

export function CarrierDetailView({
  detail,
  activeTab,
  setActiveTab,
}: {
  detail: CarrierDetail;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) {
  const c = detail.carrier;
  const badge = entityTypeBadge(c.classdef);
  const tablistRef = useRef<HTMLDivElement>(null);

  // Authority age computation
  const authorityAge = computeAuthorityAge(c.add_date);

  // Record this lookup in search history (fire-and-forget)
  useEffect(() => {
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dotNumber: c.dot_number, legalName: c.legal_name }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.dot_number]);

  // Watchlist state
  const [watched, setWatched] = useState<boolean | null>(null);
  const [watchLoading, setWatchLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/watchlist?dot=${c.dot_number}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setWatched(data.watched ?? false); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.dot_number]);

  function toggleWatch() {
    if (watched === null || watchLoading) return;
    setWatchLoading(true);
    if (watched) {
      fetch(`/api/watchlist/${c.dot_number}`, { method: "DELETE" })
        .then((r) => { if (r.ok || r.status === 204) setWatched(false); })
        .catch(() => {})
        .finally(() => setWatchLoading(false));
    } else {
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dotNumber: c.dot_number,
          legalName: c.legal_name,
          usdotStatus: detail.fmcsaStatus?.usdotStatus ?? null,
          authStatus: detail.fmcsaStatus?.operatingAuthorityStatus ?? null,
        }),
      })
        .then((r) => { if (r.ok || r.status === 201) setWatched(true); })
        .catch(() => {})
        .finally(() => setWatchLoading(false));
    }
  }

  // Lazy inspections state
  const [inspections, setInspections] = useState<SocrataInspection[] | null>(null);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);

  // Lazy crashes state
  const [crashes, setCrashes] = useState<SocrataCrash[] | null>(null);
  const [crashesLoading, setCrashesLoading] = useState(false);
  const [crashesError, setCrashesError] = useState<string | null>(null);

  // Lazy insurance state
  const [insurance, setInsurance] = useState<SocrataInsurance[] | null>(null);
  const [authorityHistory, setAuthorityHistory] = useState<SocrataAuthorityHistory[] | null>(null);
  const [insuranceLoading, setInsuranceLoading] = useState(false);
  const [insuranceError, setInsuranceError] = useState<string | null>(null);

  // Lazy fleet state
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);

  // Lazy detection state
  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Lazy affiliations state
  const [affiliationsData, setAffiliationsData] = useState<AffiliationsData | null>(null);
  const [affiliationsLoading, setAffiliationsLoading] = useState(false);
  const [affiliationsError, setAffiliationsError] = useState<string | null>(null);

  // Lazy background state
  const [backgroundData, setBackgroundData] = useState<BackgroundData | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);

  // Lazy vulnerability report state
  const [vulnerabilityData, setVulnerabilityData] = useState<FleetVulnerabilityReport | null>(null);
  const [vulnerabilityLoading, setVulnerabilityLoading] = useState(false);
  const [vulnerabilityError, setVulnerabilityError] = useState<string | null>(null);

  // Lazy cost impact state
  const [costImpactData, setCostImpactData] = useState<CostImpactReport | null>(null);
  const [costImpactLoading, setCostImpactLoading] = useState(false);
  const [costImpactError, setCostImpactError] = useState<string | null>(null);

  // Lazy driver scorecards state
  const [driverScorecards, setDriverScorecards] = useState<Map<string, DriverScorecardData>>(new Map());
  const [driverList, setDriverList] = useState<{ cdlKey: string; inspections: number; violations: number; oosEvents: number; cleanRate: number }[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  // Lazy enforcement heatmap state
  const [enforcementData, setEnforcementData] = useState<HeatmapData | null>(null);
  const [enforcementLoading, setEnforcementLoading] = useState(false);
  const [enforcementError, setEnforcementError] = useState<string | null>(null);

  // Lazy enabler data state
  const [enablerData, setEnablerData] = useState<CarrierEnablersData | null>(null);
  const [enablerLoading, setEnablerLoading] = useState(false);

  // Violation trend sparkline data (eagerly loaded)
  const [violationTrend, setViolationTrend] = useState<MonthlyViolationData[] | null>(null);

  // Tabs that need inspections data: overview, safety, inspections
  const needsInspections =
    activeTab === "overview" || activeTab === "safety" || activeTab === "inspections";

  useEffect(() => {
    if (!needsInspections || inspections || inspectionsLoading) return;

    setInspectionsLoading(true);
    setInspectionsError(null);
    fetch(`/api/carrier/${c.dot_number}/inspections`)
      .then((res) => {
        if (!res.ok) throw new Error(`Inspections returned ${res.status}`);
        return res.json();
      })
      .then((data: { inspections: SocrataInspection[] }) =>
        setInspections(data.inspections)
      )
      .catch(() => setInspectionsError("Failed to load inspections."))
      .finally(() => setInspectionsLoading(false));
  }, [needsInspections, c.dot_number, inspections, inspectionsLoading]);

  // Tabs that need crashes data: overview, crashes
  const needsCrashes = activeTab === "overview" || activeTab === "crashes";

  useEffect(() => {
    if (!needsCrashes || crashes || crashesLoading) return;

    setCrashesLoading(true);
    setCrashesError(null);
    fetch(`/api/carrier/${c.dot_number}/crashes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Crashes returned ${res.status}`);
        return res.json();
      })
      .then((data: { crashes: SocrataCrash[] }) => setCrashes(data.crashes))
      .catch(() => setCrashesError("Failed to load crashes."))
      .finally(() => setCrashesLoading(false));
  }, [needsCrashes, c.dot_number, crashes, crashesLoading]);

  // Insurance + authority history
  const needsInsurance = activeTab === "insurance" || activeTab === "overview";

  useEffect(() => {
    if (!needsInsurance || insurance || insuranceLoading) return;

    setInsuranceLoading(true);
    setInsuranceError(null);
    fetch(`/api/carrier/${c.dot_number}/insurance`)
      .then((res) => {
        if (!res.ok) throw new Error(`Insurance returned ${res.status}`);
        return res.json();
      })
      .then(
        (data: {
          insurance: SocrataInsurance[];
          authorityHistory: SocrataAuthorityHistory[];
        }) => {
          setInsurance(data.insurance);
          setAuthorityHistory(data.authorityHistory);
        }
      )
      .catch(() => setInsuranceError("Failed to load insurance data."))
      .finally(() => setInsuranceLoading(false));
  }, [needsInsurance, c.dot_number, insurance, insuranceLoading]);

  useEffect(() => {
    if (activeTab !== "fleet" || fleetData || fleetLoading) return;

    setFleetLoading(true);
    setFleetError(null);
    fetch(`/api/carrier/${c.dot_number}/fleet`)
      .then((res) => {
        if (!res.ok) throw new Error(`Fleet returned ${res.status}`);
        return res.json();
      })
      .then((data: FleetData) => setFleetData(data))
      .catch(() => setFleetError("Failed to load fleet data."))
      .finally(() => setFleetLoading(false));
  }, [activeTab, c.dot_number, fleetData, fleetLoading]);

  useEffect(() => {
    if (activeTab !== "detection" || detectionData || detectionLoading) return;

    setDetectionLoading(true);
    setDetectionError(null);
    fetch(`/api/chameleon/carriers/${c.dot_number}/signals`)
      .then((res) => {
        if (!res.ok) throw new Error(`Detection returned ${res.status}`);
        return res.json();
      })
      .then((data: DetectionData) => setDetectionData(data))
      .catch(() => setDetectionError("Failed to load detection signals."))
      .finally(() => setDetectionLoading(false));
  }, [activeTab, c.dot_number, detectionData, detectionLoading]);

  useEffect(() => {
    if (activeTab !== "affiliations" || affiliationsData || affiliationsLoading) return;

    setAffiliationsLoading(true);
    setAffiliationsError(null);
    fetch(`/api/carrier/${c.dot_number}/affiliations`)
      .then((res) => {
        if (!res.ok) throw new Error(`Affiliations returned ${res.status}`);
        return res.json();
      })
      .then((data: AffiliationsData) => setAffiliationsData(data))
      .catch(() => setAffiliationsError("Failed to load affiliations."))
      .finally(() => setAffiliationsLoading(false));
  }, [activeTab, c.dot_number, affiliationsData, affiliationsLoading]);

  useEffect(() => {
    if (activeTab !== "background" || backgroundData || backgroundLoading) return;

    setBackgroundLoading(true);
    setBackgroundError(null);
    fetch(`/api/carrier/${c.dot_number}/background`)
      .then((res) => {
        if (!res.ok) throw new Error(`Background returned ${res.status}`);
        return res.json();
      })
      .then((data: BackgroundData) => setBackgroundData(data))
      .catch(() => setBackgroundError("Failed to load background checks."))
      .finally(() => setBackgroundLoading(false));
  }, [activeTab, c.dot_number, backgroundData, backgroundLoading]);

  // Lazy load: vulnerability report
  useEffect(() => {
    if (activeTab !== "vulnerability" || vulnerabilityData || vulnerabilityLoading) return;
    setVulnerabilityLoading(true);
    setVulnerabilityError(null);
    fetch(`/api/carriers/${c.dot_number}/vulnerability`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: FleetVulnerabilityReport) => setVulnerabilityData(data))
      .catch(() => setVulnerabilityError("Failed to load vulnerability report."))
      .finally(() => setVulnerabilityLoading(false));
  }, [activeTab, c.dot_number, vulnerabilityData, vulnerabilityLoading]);

  // Lazy load: cost impact
  useEffect(() => {
    if (activeTab !== "cost-impact" || costImpactData || costImpactLoading) return;
    setCostImpactLoading(true);
    setCostImpactError(null);
    fetch(`/api/carriers/${c.dot_number}/cost-impact`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: CostImpactReport) => setCostImpactData(data))
      .catch(() => setCostImpactError("Failed to load cost impact data."))
      .finally(() => setCostImpactLoading(false));
  }, [activeTab, c.dot_number, costImpactData, costImpactLoading]);

  // Lazy load: driver list (from vulnerability report)
  useEffect(() => {
    if (activeTab !== "drivers" || driverList.length > 0 || driversLoading) return;
    setDriversLoading(true);
    setDriversError(null);
    fetch(`/api/carriers/${c.dot_number}/vulnerability`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: FleetVulnerabilityReport) => {
        setDriverList(
          data.driverRisk.map((d) => ({
            cdlKey: d.cdlKey,
            inspections: d.inspections,
            violations: d.violations,
            oosEvents: d.oosEvents,
            cleanRate: d.inspections > 0 ? ((d.inspections - d.oosEvents) / d.inspections) * 100 : 100,
          }))
        );
      })
      .catch(() => setDriversError("Failed to load driver data."))
      .finally(() => setDriversLoading(false));
  }, [activeTab, c.dot_number, driverList.length, driversLoading]);

  // Lazy load: enforcement heatmap
  useEffect(() => {
    if (activeTab !== "enforcement" || enforcementData || enforcementLoading) return;
    setEnforcementLoading(true);
    setEnforcementError(null);
    fetch("/api/enforcement/heatmap")
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: HeatmapData) => setEnforcementData(data))
      .catch(() => setEnforcementError("Failed to load enforcement data."))
      .finally(() => setEnforcementLoading(false));
  }, [activeTab, enforcementData, enforcementLoading]);

  // Lazy load: enabler data
  useEffect(() => {
    if (activeTab !== "enablers" || enablerData || enablerLoading) return;
    setEnablerLoading(true);
    fetch(`/api/carriers/${c.dot_number}/enablers`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: CarrierEnablersData) => setEnablerData(data))
      .catch(() => {})
      .finally(() => setEnablerLoading(false));
  }, [activeTab, c.dot_number, enablerData, enablerLoading]);

  // Eagerly load violation trend for sparkline on overview
  useEffect(() => {
    fetch(`/api/carriers/${c.dot_number}/violation-trend`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: { months: MonthlyViolationData[] }) => setViolationTrend(data.months))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.dot_number]);

  // Also eagerly load enabler data for overview warning panel
  useEffect(() => {
    if (enablerData || enablerLoading) return;
    setEnablerLoading(true);
    fetch(`/api/carriers/${c.dot_number}/enablers`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: CarrierEnablersData) => setEnablerData(data))
      .catch(() => {})
      .finally(() => setEnablerLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.dot_number]);

  // Fetch individual driver scorecard on selection
  function handleDriverSelect(cdlKey: string) {
    if (driverScorecards.has(cdlKey)) return;
    fetch(`/api/drivers/${encodeURIComponent(cdlKey)}/scorecard?dot=${c.dot_number}`)
      .then((res) => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then((data: DriverScorecardData) => {
        setDriverScorecards((prev) => new Map(prev).set(cdlKey, data));
      })
      .catch(() => {});
  }

  // Use counts from the main response, or fall back to loaded data length
  const inspectionCount = inspections?.length ?? detail.inspectionCount ?? 0;
  const crashCount = crashes?.length ?? detail.crashCount ?? 0;

  const tabs: { key: Tab; label: string; count?: number; group?: "ops" | "compliance" | "intelligence" }[] = [
    { key: "overview", label: "Overview", group: "ops" },
    { key: "safety", label: "Safety", group: "ops" },
    { key: "inspections", label: "Inspections", count: inspectionCount, group: "ops" },
    { key: "crashes", label: "Crashes", count: crashCount, group: "ops" },
    { key: "insurance", label: "Insurance", group: "compliance" },
    { key: "fleet", label: "Fleet", group: "compliance" },
    { key: "detection", label: "Detection", group: "compliance" },
    { key: "affiliations", label: "Affiliations", count: affiliationsData?.affiliatedCarrierCount, group: "compliance" },
    { key: "background", label: "Background", group: "compliance" },
    { key: "vulnerability", label: "Violations", group: "intelligence" },
    { key: "drivers", label: "Drivers", group: "intelligence" },
    { key: "cost-impact", label: "Cost Impact", group: "intelligence" },
    { key: "enforcement", label: "Enforcement", group: "intelligence" },
    { key: "enablers", label: "Enablers", count: enablerData?.enablers?.length, group: "intelligence" },
    { key: "notes", label: "Notes", group: "intelligence" },
    { key: "reports", label: "Reports", count: detail.communityReportSummary?.totalReports12m, group: "intelligence" },
  ];

  function handleTabKeyDown(e: React.KeyboardEvent) {
    const currentIdx = tabs.findIndex((t) => t.key === activeTab);
    let nextIdx = -1;
    if (e.key === "ArrowRight") {
      nextIdx = (currentIdx + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    } else {
      return;
    }
    e.preventDefault();
    setActiveTab(tabs[nextIdx].key);
    const btn = tablistRef.current?.querySelector<HTMLButtonElement>(
      `#tab-${tabs[nextIdx].key}`
    );
    btn?.focus();
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Carrier Header */}
      <div className="overflow-hidden rounded-xl shadow-sm" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--ink)" }}>
                {c.legal_name}
              </h2>
              {c.dba_name && (
                <p className="text-sm" style={{ color: "var(--ink-soft)" }}>DBA {c.dba_name}</p>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                USDOT {c.dot_number}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Export */}
              <a
                href={`/carrier/${c.dot_number}/report`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open print-ready vetting report"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 bg-[var(--surface-1)] text-[var(--ink-soft)] ring-gray-200 hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 13h8M8 2v8M5 7l3 3 3-3" /><rect x="2" y="11" width="12" height="4" rx="1" />
                </svg>
                Export PDF
              </a>
              {/* Watch button — only shown once auth check resolves */}
              {watched !== null && (
                <button
                  onClick={toggleWatch}
                  disabled={watchLoading}
                  title={watched ? "Remove from watchlist" : "Add to watchlist"}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
                    watched
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-300 hover:bg-indigo-100"
                      : "bg-[var(--surface-1)] text-[var(--ink-soft)] ring-gray-200 hover:bg-[var(--surface-2)] hover:text-[var(--ink-soft)]"
                  } disabled:opacity-50`}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill={watched ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.4"
                  >
                    <path d="M6 1L7.5 4.5H11L8 6.5L9.5 10L6 8L2.5 10L4 6.5L1 4.5H4.5L6 1Z" />
                  </svg>
                  {watched ? "Watching" : "Watch"}
                </button>
              )}
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLORS[badge.color]}`}
              >
                {badge.label}
              </span>
              <UsdotStatusBadge
                socrataStatus={c.status_code}
                fmcsaStatus={detail.fmcsaStatus}
              />
              {detail.fmcsaStatus?.operatingAuthorityStatus && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    detail.fmcsaStatus.operatingAuthorityStatus === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                      : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                  }`}
                  title="Operating authority status from FMCSA"
                >
                  Auth: {detail.fmcsaStatus.operatingAuthorityStatus}
                </span>
              )}
              {detail.fmcsaStatus?.hasActiveOos && (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 ring-1 ring-rose-600/30">
                  OUT OF SERVICE
                </span>
              )}
              {detail.safetyRating && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    SAFETY_RATING_COLORS[detail.safetyRating] ??
                    "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-gray-600/20"
                  }`}
                  title={
                    detail.safetyRatingDate
                      ? `Safety rating as of ${detail.safetyRatingDate}`
                      : "FMCSA safety rating"
                  }
                >
                  {detail.safetyRating}
                </span>
              )}
              {detail.smartwayPartner && (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                  SmartWay
                </span>
              )}
              {authorityAge.badge && (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${authorityAge.badge.className}`}>
                  {authorityAge.badge.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="Carrier detail sections"
        onKeyDown={handleTabKeyDown}
        className="mt-4 flex gap-1 overflow-x-auto scrollbar-hide"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        {tabs.map((t, i) => (
          <span key={t.key} className="flex items-center">
            {i > 0 && tabs[i - 1].group !== t.group && (
              <span className="mx-1 h-4 w-px" style={{ background: "var(--border)" }} aria-hidden="true" />
            )}
            <button
              id={`tab-${t.key}`}
              role="tab"
              aria-selected={activeTab === t.key}
              aria-controls={`panel-${t.key}`}
              tabIndex={activeTab === t.key ? 0 : -1}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === t.key
                  ? "border-b-2 border-indigo-500 text-indigo-500"
                  : ""
              }`}
              style={{
                color: activeTab === t.key ? undefined : "var(--ink-soft)",
              }}
            >
              {t.label}
              {t.count != null && (
                <span className="ml-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                  ({t.count})
                </span>
              )}
            </button>
          </span>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`tab-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          {activeTab === "overview" && enablerData && (
            <EnablerWarningPanel
              enablers={enablerData.enablers}
              warnings={enablerData.warnings}
            />
          )}
          {activeTab === "overview" && violationTrend && violationTrend.some((m) => m.violations > 0) && (
            <div className="rounded-xl p-4" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Violation Trend (12mo)</p>
                  <p className="mt-0.5 text-[10px]" style={{ color: "var(--ink-muted)" }}>
                    <span style={{ color: "var(--ink-soft)" }}>&#x2014;</span> total &nbsp;
                    <span className="text-rose-500">&#x2014;</span> OOS
                  </p>
                </div>
                <ViolationSparkline monthlyData={violationTrend} />
              </div>
            </div>
          )}
          {activeTab === "overview" && (
            <OverviewTab
              carrier={c}
              authority={detail.authority}
              oos={detail.oos}
              basics={detail.basics}
              inspections={inspections ?? []}
              crashes={crashes ?? []}
              authorityHistory={authorityHistory ?? []}
              peerBenchmark={detail.peerBenchmark}
              onSwitchToSafety={() => setActiveTab("safety")}
              onSwitchTab={(tab) => setActiveTab(tab as Tab)}
              voip={detail.voip}
              sosResult={detail.sosResult}
              affiliatedCarriers={detail.affiliatedCarriers}
              fmcsaStatus={detail.fmcsaStatus}
              communityReportSummary={detail.communityReportSummary}
            />
          )}
          {activeTab === "safety" && (
            <SafetyTab
              basics={detail.basics}
              inspections={inspections ?? []}
            />
          )}
          {activeTab === "inspections" && (
            <InspectionsTab
              inspections={inspections ?? []}
              carrierName={c.legal_name}
              loading={inspectionsLoading}
              error={inspectionsError}
            />
          )}
          {activeTab === "crashes" && (
            <CrashesTab
              crashes={crashes ?? []}
              loading={crashesLoading}
              error={crashesError}
            />
          )}
          {activeTab === "insurance" && (
            <InsuranceTab
              insurance={insurance ?? []}
              authorityHistory={authorityHistory ?? []}
              isHazmat={c.hm_ind === "Y"}
              loading={insuranceLoading}
              error={insuranceError}
            />
          )}
          {activeTab === "fleet" && (
            <FleetTab
              data={fleetData}
              loading={fleetLoading}
              error={fleetError}
            />
          )}
          {activeTab === "detection" && (
            <DetectionTab
              data={detectionData}
              loading={detectionLoading}
              error={detectionError}
            />
          )}
          {activeTab === "affiliations" && (
            <AffiliationsTab
              data={affiliationsData}
              loading={affiliationsLoading}
              error={affiliationsError}
              dotNumber={c.dot_number}
            />
          )}
          {activeTab === "background" && (
            <BackgroundTab
              data={backgroundData}
              loading={backgroundLoading}
              error={backgroundError}
            />
          )}
          {activeTab === "vulnerability" && (
            <VulnerabilityTab
              data={vulnerabilityData}
              loading={vulnerabilityLoading}
              error={vulnerabilityError}
            />
          )}
          {activeTab === "cost-impact" && (
            <CostImpactTab
              data={costImpactData}
              loading={costImpactLoading}
              error={costImpactError}
            />
          )}
          {activeTab === "drivers" && (
            <DriverScorecardTab
              scorecards={driverScorecards}
              driverList={driverList}
              loading={driversLoading}
              error={driversError}
              onSelectDriver={handleDriverSelect}
            />
          )}
          {activeTab === "enforcement" && (
            <EnforcementTab
              data={enforcementData}
              loading={enforcementLoading}
              error={enforcementError}
            />
          )}
          {activeTab === "enablers" && enablerData && (
            <EnablerWarningPanel
              enablers={enablerData.enablers}
              warnings={enablerData.warnings}
            />
          )}
          {activeTab === "notes" && (
            <NotesTab dotNumber={c.dot_number} />
          )}
          {activeTab === "reports" && (
            <ReportsTab dotNumber={c.dot_number} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Authority Age Helper ─────────────────────────────────────── */

function computeAuthorityAge(addDate?: string): {
  days: number | null;
  formatted: string | null;
  badge: { label: string; className: string } | null;
} {
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
  const formatted = years > 0
    ? `${years}y ${months}m`
    : `${months} months`;

  return { days, formatted, badge: null };
}

/* ── USDOT Status Badge ─────────────────────────────────────── */

function UsdotStatusBadge({
  socrataStatus,
  fmcsaStatus,
}: {
  socrataStatus?: string;
  fmcsaStatus?: FmcsaStatus | null;
}) {
  const liveStatus = fmcsaStatus?.usdotStatus;
  const isAuthorized = liveStatus === "AUTHORIZED";
  const isOos = liveStatus === "OUT-OF-SERVICE";
  const isNotAuth = liveStatus === "NOT AUTHORIZED";

  // When FMCSA data is available, use it as source of truth
  if (liveStatus) {
    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          isAuthorized
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
            : isOos
              ? "bg-rose-100 text-rose-800 ring-1 ring-rose-600/30"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
        }`}
        title={`FMCSA live status${fmcsaStatus?.oosDate ? ` — OOS since ${fmcsaStatus.oosDate}` : ""}`}
      >
        {isOos ? "OUT OF SERVICE" : isNotAuth ? "NOT AUTHORIZED" : "AUTHORIZED"}
      </span>
    );
  }

  // Fallback to Socrata Census status
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        socrataStatus === "A"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
      }`}
      title="Status from Census snapshot — may be outdated"
    >
      {decodeStatus(socrataStatus)}
    </span>
  );
}
