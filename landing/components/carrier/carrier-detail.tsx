"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";
import { BADGE_COLORS } from "./shared";
import { OverviewTab } from "./tabs/overview-tab";
import { SafetyTab } from "./tabs/safety-tab";
import { InspectionsTab } from "./tabs/inspections-tab";
import { CrashesTab } from "./tabs/crashes-tab";
import { InsuranceTab } from "./tabs/insurance-tab";
import { FleetTab } from "./tabs/fleet-tab";
import { DetectionTab } from "./tabs/detection-tab";
import type { CarrierDetail, Tab, FleetData, DetectionData } from "./types";

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

  // Lazy fleet state
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState<string | null>(null);

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

  // Lazy detection state
  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [detectionLoading, setDetectionLoading] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

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

  const tabs: { key: Tab; label: string; count?: number; group?: "ops" | "compliance" }[] = [
    { key: "overview", label: "Overview", group: "ops" },
    { key: "safety", label: "Safety", group: "ops" },
    { key: "inspections", label: "Inspections", count: detail.inspections.length, group: "ops" },
    { key: "crashes", label: "Crashes", count: detail.crashes.length, group: "ops" },
    { key: "insurance", label: "Insurance", group: "compliance" },
    { key: "fleet", label: "Fleet", group: "compliance" },
    { key: "detection", label: "Detection", group: "compliance" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Carrier Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {c.legal_name}
              </h2>
              {c.dba_name && (
                <p className="text-sm text-gray-500">DBA {c.dba_name}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                USDOT {c.dot_number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLORS[badge.color]}`}
              >
                {badge.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.status_code === "A"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                }`}
              >
                {decodeStatus(c.status_code)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto scrollbar-hide border-b border-gray-200">
        {tabs.map((t, i) => (
          <span key={t.key} className="flex items-center">
            {/* Separator between ops and compliance groups */}
            {i > 0 && tabs[i - 1].group !== t.group && (
              <span className="mx-1 h-4 w-px bg-gray-300" />
            )}
            <button
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === t.key
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="ml-1.5 text-xs text-gray-400">
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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          {activeTab === "overview" && (
            <OverviewTab
              carrier={c}
              authority={detail.authority}
              oos={detail.oos}
              basics={detail.basics}
              inspections={detail.inspections}
              crashes={detail.crashes}
              authorityHistory={detail.authorityHistory}
              peerBenchmark={detail.peerBenchmark}
              onSwitchToSafety={() => setActiveTab("safety")}
            />
          )}
          {activeTab === "safety" && (
            <SafetyTab
              basics={detail.basics}
              inspections={detail.inspections}
            />
          )}
          {activeTab === "inspections" && (
            <InspectionsTab
              inspections={detail.inspections}
              carrierName={c.legal_name}
            />
          )}
          {activeTab === "crashes" && (
            <CrashesTab crashes={detail.crashes} />
          )}
          {activeTab === "insurance" && (
            <InsuranceTab
              insurance={detail.insurance}
              authorityHistory={detail.authorityHistory}
              isHazmat={c.hm_ind === "Y"}
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
