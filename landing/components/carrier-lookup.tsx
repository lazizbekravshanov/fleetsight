"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  decodeCarship,
  decodeStatus,
  decodeOperation,
  decodeFleetSize,
  decodeInspectionLevel,
  decodeVehicleConfig,
  decodeCargoBodyType,
  decodeClassdef,
  entityTypeBadge,
} from "@/lib/fmcsa-codes";
import type { SocrataCarrier, SocrataInspection, SocrataCrash } from "@/lib/socrata";

type SearchResult = {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  statusCode: string | null;
  phyState: string | null;
  powerUnits: number | null;
  classdef: string | null;
  businessOrgDesc: string | null;
};

type CarrierDetail = {
  carrier: SocrataCarrier;
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  basics: unknown;
  authority: unknown;
  oos: unknown;
};

type Tab = "overview" | "inspections" | "crashes";

const BADGE_COLORS = {
  blue: "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30",
  purple: "bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30",
  amber: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  slate: "bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30",
} as const;

const BORDER_COLORS = {
  blue: "border-l-indigo-500",
  purple: "border-l-purple-500",
  amber: "border-l-amber-500",
  slate: "border-l-zinc-600",
} as const;

/* ── Stats Data ─────────────────────────────────────────────────── */

const HERO_STATS = [
  { value: "4.4M", label: "FMCSA Carriers" },
  { value: "<200ms", label: "Query Speed" },
  { value: "24/7", label: "Real-Time Data" },
  { value: "50+", label: "Data Points" },
];

const FEATURES = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    title: "Chameleon Carrier Detection",
    description: "Graph-based algorithm identifies carriers that dissolve and re-register under new identities to evade safety records.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "BASIC Safety Scores",
    description: "Full Behavior Analysis and Safety Improvement Categories — crash history, inspections, and violations at a glance.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    title: "FMCSA & USDOT Compliance",
    description: "Authority status, out-of-service orders, operating credentials, and federal registration data — all in one view.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
    title: "Instant Carrier Search",
    description: "Sub-200ms fuzzy search across the entire national registry. Search by DOT number, company name, or DBA.",
  },
];

/* ── Skeleton Loading ──────────────────────────────────────────── */

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="mx-auto max-w-5xl space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
          className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-surface-1 p-5"
        >
          <div className="h-3 w-2/5 rounded-full bg-zinc-800" />
          <div className="h-3 w-1/5 rounded-full bg-zinc-800" />
          <div className="ml-auto h-3 w-1/6 rounded-full bg-zinc-800" />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export function CarrierLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [detail, setDetail] = useState<CarrierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(false);
    setSelectedDot(null);
    setDetail(null);
    setDetailError(null);
    try {
      const res = await fetch(
        `/api/carrier/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error(`Search returned ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(dotNumber: number) {
    setSelectedDot(dotNumber);
    setDetailLoading(true);
    setDetailError(null);
    setActiveTab("overview");
    try {
      const res = await fetch(`/api/carrier/${dotNumber}`);
      if (!res.ok) throw new Error(`Detail returned ${res.status}`);
      const data: CarrierDetail = await res.json();
      setDetail(data);
    } catch {
      setDetailError("Failed to load carrier details.");
    } finally {
      setDetailLoading(false);
    }
  }

  const hasResults = searched && results.length > 0;
  const showLanding = !searched && !searching;

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* ── Hero Section ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid" />
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />

        {/* Header */}
        <header className="relative z-10 border-b border-white/5">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-glow" />
              <p className="text-sm font-bold tracking-wider text-zinc-100 uppercase">
                FleetSight
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-xs text-zinc-500">
                FMCSA &middot; USDOT &middot; Federal Data
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
              <span className="text-xs text-emerald-400">Live</span>
            </div>
          </div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className={`text-center transition-all duration-500 ${showLanding ? "pt-24 pb-8" : "pt-12 pb-6"}`}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {showLanding && (
                <p className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 tracking-wide">
                  Protecting U.S. highways with data intelligence
                </p>
              )}

              <h1 className={`font-bold tracking-tight transition-all duration-500 ${
                showLanding
                  ? "text-4xl sm:text-5xl md:text-6xl"
                  : "text-2xl sm:text-3xl"
              }`}>
                <span className="text-gradient">
                  {showLanding ? "Know every carrier." : "FMCSA Carrier Lookup"}
                </span>
                {showLanding && (
                  <>
                    <br />
                    <span className="text-gradient-accent">
                      Trust no one blindly.
                    </span>
                  </>
                )}
              </h1>

              {showLanding && (
                <p className="mx-auto mt-4 max-w-xl text-base text-zinc-400 leading-relaxed">
                  Search 4.4 million FMCSA-registered carriers instantly. Inspect safety records,
                  crash history, and compliance data — built to catch the bad actors
                  before they cause harm.
                </p>
              )}
            </motion.div>

            {/* Search Bar */}
            <motion.form
              onSubmit={handleSearch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className={`mx-auto flex max-w-2xl gap-3 transition-all duration-500 ${
                showLanding ? "mt-8" : "mt-4"
              }`}
            >
              <div className="relative flex-1 glow-input rounded-xl transition-all duration-300">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="DOT number or company name..."
                  className="w-full rounded-xl border-0 bg-surface-1 py-3.5 pl-12 pr-4 text-base text-zinc-100 outline-none placeholder:text-zinc-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="glow-button rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-indigo-500 disabled:opacity-60"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </motion.form>

            {/* Stats Row */}
            {showLanding && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mx-auto mt-10 grid max-w-2xl grid-cols-4 gap-3"
              >
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-xl font-bold text-gradient-accent sm:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── Results Area ────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Loading */}
        {searching && (
          <div className="mt-8">
            <SkeletonRows />
          </div>
        )}

        {/* No results */}
        {searched && results.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 text-center text-base text-zinc-500 tracking-wide"
          >
            No carriers found. Try a different search term.
          </motion.p>
        )}

        {/* Results List */}
        {hasResults && (
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="mb-2 text-xs text-zinc-500">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            <motion.ul
              key={results.map((r) => r.dotNumber).join()}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              className="space-y-1"
            >
              {results.map((r) => {
                const badge = entityTypeBadge(r.classdef);
                return (
                  <motion.li
                    key={r.dotNumber}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <button
                      onClick={() => handleSelect(r.dotNumber)}
                      className={`flex w-full items-center justify-between rounded-lg border-l-2 ${BORDER_COLORS[badge.color]} px-3 py-2.5 text-left transition-all duration-200 hover:bg-surface-2 ${
                        selectedDot === r.dotNumber
                          ? "bg-surface-2 ring-1 ring-indigo-500/40"
                          : "bg-surface-1"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">
                          {r.legalName}
                          {r.dbaName && (
                            <span className="ml-2 text-zinc-500">
                              DBA {r.dbaName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">
                          DOT {r.dotNumber}
                          {r.phyState && (
                            <span className="ml-2">{r.phyState}</span>
                          )}
                          {r.powerUnits != null && (
                            <span className="ml-2">
                              {r.powerUnits} power unit
                              {r.powerUnits !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        {r.classdef && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[badge.color]}`}
                          >
                            {badge.label}
                          </span>
                        )}
                        {r.statusCode && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.statusCode === "A"
                                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                                : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                            }`}
                          >
                            {decodeStatus(r.statusCode)}
                          </span>
                        )}
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          </div>
        )}

        {/* Detail */}
        {selectedDot && (
          <motion.div
            key={selectedDot}
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {detailLoading && <SkeletonRows />}
            {detailError && (
              <p className="text-center text-sm text-rose-400">{detailError}</p>
            )}
            {detail && <CarrierDetailView detail={detail} activeTab={activeTab} setActiveTab={setActiveTab} />}
          </motion.div>
        )}

        {/* ── Landing Content (shown when no search) ─────────── */}
        {showLanding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            {/* Features Grid */}
            <div className="mt-20">
              <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                What FleetSight Does
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="glass glow-card rounded-xl p-5 transition-all duration-300"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                      {f.icon}
                    </div>
                    <h3 className="mb-1 text-sm font-semibold text-zinc-200">
                      {f.title}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Section */}
            <div className="mt-20 text-center">
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Built on Public Federal Data
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {["FMCSA", "USDOT", "SAFER", "NHTSA"].map((source) => (
                  <span
                    key={source}
                    className="text-sm font-semibold tracking-wider text-zinc-600"
                  >
                    {source}
                  </span>
                ))}
              </div>
              <p className="mx-auto mt-6 max-w-lg text-xs text-zinc-600 leading-relaxed">
                FleetSight indexes the complete FMCSA national carrier registry — 4.4 million records
                of motor carriers, freight brokers, and freight forwarders.
                All data sourced from publicly available federal safety datasets.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-20 border-t border-white/5 pt-8 text-center">
              <p className="text-xs text-zinc-600">
                FleetSight &middot; FMCSA &amp; USDOT Compliance Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}

/* ── Carrier Detail ─────────────────────────────────────────────── */

function CarrierDetailView({
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
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "inspections", label: "Inspections", count: detail.inspections.length },
    { key: "crashes", label: "Crashes", count: detail.crashes.length },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Carrier Header */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-surface-1 shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">
                {c.legal_name}
              </h2>
              {c.dba_name && (
                <p className="text-sm text-zinc-500">DBA {c.dba_name}</p>
              )}
              <p className="mt-1 text-xs text-zinc-600">
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
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                }`}
              >
                {decodeStatus(c.status_code)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === t.key
                ? "border-b-2 border-indigo-500 text-indigo-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 text-xs text-zinc-600">({t.count})</span>
            )}
          </button>
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
          {activeTab === "overview" && <OverviewTab carrier={c} authority={detail.authority} oos={detail.oos} />}
          {activeTab === "inspections" && (
            <InspectionsTab inspections={detail.inspections} />
          )}
          {activeTab === "crashes" && <CrashesTab crashes={detail.crashes} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────────── */

function OverviewTab({ carrier: c, authority, oos }: { carrier: SocrataCarrier; authority: unknown; oos: unknown }) {
  const address = [c.phy_street, c.phy_city, c.phy_state, c.phy_zip]
    .filter(Boolean)
    .join(", ");
  const mailingAddress = [c.carrier_mailing_street, c.carrier_mailing_city, c.carrier_mailing_state, c.carrier_mailing_zip]
    .filter(Boolean)
    .join(", ");
  const classifications = decodeClassdef(c.classdef);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Company Info */}
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
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
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
          <Row
            label="Hazmat"
            value={c.hm_ind === "Y" ? "Yes" : "No"}
          />
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

      {/* Authority Info */}
      <div className="rounded-xl border border-zinc-800 bg-surface-1 p-5 md:col-span-2">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
          Authority &amp; Operating Status
        </h3>
        <AuthoritySection authority={authority} oos={oos} />
      </div>
    </div>
  );
}

/* ── Authority Section ──────────────────────────────────────────── */

function AuthoritySection({ authority, oos }: { authority: unknown; oos: unknown }) {
  const authorityRecords = extractArray(authority, "authority");
  const oosRecords = extractArray(oos, "oos");

  if (authorityRecords.length === 0 && oosRecords.length === 0) {
    return (
      <p className="text-sm text-zinc-600 tracking-wide">
        Authority data not available. Ensure FMCSA_WEBKEY is configured to retrieve operating authority details.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {authorityRecords.length > 0 && (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-zinc-700 text-zinc-500">
                <th className="px-3 py-2">Authority Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Granted Date</th>
                <th className="hidden px-3 py-2 sm:table-cell">Docket</th>
              </tr>
            </thead>
            <tbody>
              {authorityRecords.map((a, i) => (
                <tr key={i} className="border-b border-zinc-800 transition hover:bg-surface-2 even:bg-surface-2/50">
                  <td className="px-3 py-2">{str(a.authorityType) || str(a.authTypDesc) || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      str(a.authStatusDesc)?.toUpperCase() === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                    }`}>
                      {str(a.authStatusDesc) || str(a.authStatus) || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {str(a.authGrantDate) ? new Date(str(a.authGrantDate)!).toLocaleDateString() : "—"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    {str(a.docketNbr) || str(a.docketPrefix) ? `${str(a.docketPrefix) ?? ""}${str(a.docketNbr) ?? ""}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {oosRecords.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Out-of-Service Orders
          </h4>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-zinc-700 text-zinc-500">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Effective Date</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {oosRecords.map((o, i) => (
                  <tr key={i} className="border-b border-zinc-800 transition hover:bg-surface-2 even:bg-surface-2/50">
                    <td className="px-3 py-2">{str(o.oosType) || str(o.oosTypeDesc) || "—"}</td>
                    <td className="px-3 py-2">
                      {str(o.oosDate) || str(o.effectiveDate) ? new Date((str(o.oosDate) || str(o.effectiveDate))!).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      {str(o.oosReason) || str(o.oosReasonDesc) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-600">
        Insurance details (BIPD, cargo, bond) are not available via public API.
      </p>
    </div>
  );
}

/** Extract array from FMCSA nested response shape */
function extractArray(payload: unknown, key: string): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  if (obj.content && typeof obj.content === "object") {
    const content = obj.content as Record<string, unknown>;
    const val = content[key];
    if (Array.isArray(val)) return val as Record<string, unknown>[];
    if (val && typeof val === "object") return [val as Record<string, unknown>];
  }
  const val = obj[key];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  if (val && typeof val === "object") return [val as Record<string, unknown>];
  return [];
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  return s === "" ? null : s;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-200">{value}</dd>
    </div>
  );
}

/* ── Inspections Tab ────────────────────────────────────────────── */

function InspectionsTab({
  inspections,
}: {
  inspections: SocrataInspection[];
}) {
  if (inspections.length === 0) {
    return (
      <p className="py-12 text-center text-base text-zinc-500 tracking-wide">
        No inspection records found.
      </p>
    );
  }

  const totalViols = inspections.reduce(
    (s, i) => s + (parseInt(i.viol_total ?? "0", 10) || 0),
    0
  );
  const totalOos = inspections.reduce(
    (s, i) => s + (parseInt(i.oos_total ?? "0", 10) || 0),
    0
  );

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Inspections" value={inspections.length} />
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="Out of Service" value={totalOos} />
        <Stat
          label="OOS Rate"
          value={
            inspections.length > 0
              ? `${((totalOos / inspections.length) * 100).toFixed(1)}%`
              : "N/A"
          }
        />
      </div>

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-zinc-700 text-zinc-500">
              <th className="px-3 py-2">Date</th>
              <th className="hidden px-3 py-2 sm:table-cell">Report #</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2 text-right">Violations</th>
              <th className="px-3 py-2 text-right">OOS</th>
              <th className="hidden px-3 py-2 text-center md:table-cell">Post-Acc</th>
              <th className="hidden px-3 py-2 text-right lg:table-cell">Weight (lbs)</th>
              <th className="hidden px-3 py-2 sm:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp, i) => (
              <tr
                key={insp.inspection_id ?? i}
                className="border-b border-zinc-800 transition hover:bg-surface-2 even:bg-surface-2/50"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {insp.insp_date
                    ? new Date(insp.insp_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-zinc-500">
                  {insp.report_number ?? "—"}
                </td>
                <td className="px-3 py-2">{insp.report_state ?? "—"}</td>
                <td className="px-3 py-2">
                  {decodeInspectionLevel(insp.insp_level_id)}
                </td>
                <td className="px-3 py-2 text-right">
                  {insp.viol_total ?? "0"}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(insp.oos_total ?? "0", 10) > 0 ? (
                    <span className="text-rose-400">{insp.oos_total}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="hidden px-3 py-2 text-center md:table-cell">
                  {insp.post_acc_ind === "Y" ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                      Yes
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-right lg:table-cell text-zinc-500">
                  {insp.gross_comb_veh_wt
                    ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString()
                    : "—"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-zinc-500" title={insp.insp_facility ?? undefined}>
                  {insp.location_desc ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Crashes Tab ────────────────────────────────────────────────── */

function CrashesTab({ crashes }: { crashes: SocrataCrash[] }) {
  if (crashes.length === 0) {
    return (
      <p className="py-12 text-center text-base text-zinc-500 tracking-wide">
        No crash records found.
      </p>
    );
  }

  const totalFatalities = crashes.reduce(
    (s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0),
    0
  );
  const totalInjuries = crashes.reduce(
    (s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0),
    0
  );
  const totalTowAway = crashes.reduce(
    (s, c) => s + (parseInt(c.tow_away ?? "0", 10) || 0),
    0
  );

  return (
    <div>
      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4">
        <Stat label="Total Crashes" value={crashes.length} />
        <Stat label="Fatalities" value={totalFatalities} warn />
        <Stat label="Injuries" value={totalInjuries} warn={totalInjuries > 0} />
        <Stat label="Tow-Aways" value={totalTowAway} />
      </div>

      {/* Table */}
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-zinc-700 text-zinc-500">
              <th className="px-3 py-2">Date</th>
              <th className="hidden px-3 py-2 sm:table-cell">Report #</th>
              <th className="px-3 py-2">State</th>
              <th className="hidden px-3 py-2 sm:table-cell">City</th>
              <th className="hidden px-3 py-2 md:table-cell">Vehicle</th>
              <th className="px-3 py-2 text-right">Fatal</th>
              <th className="px-3 py-2 text-right">Injuries</th>
              <th className="px-3 py-2 text-right">Tow</th>
              <th className="hidden px-3 py-2 text-center lg:table-cell">Fed Rec.</th>
            </tr>
          </thead>
          <tbody>
            {crashes.map((cr, i) => (
              <tr
                key={cr.crash_id ?? i}
                className="border-b border-zinc-800 transition hover:bg-surface-2 even:bg-surface-2/50"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date
                    ? new Date(cr.report_date).toLocaleDateString()
                    : "—"}
                  {cr.report_time && (
                    <span className="ml-1 text-zinc-500">{cr.report_time}</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-zinc-500">
                  {cr.report_number ?? "—"}
                </td>
                <td className="px-3 py-2">{cr.report_state ?? "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {cr.city ?? "—"}
                </td>
                <td className="hidden px-3 py-2 md:table-cell text-zinc-500" title={cr.vehicle_configuration_id ? decodeVehicleConfig(cr.vehicle_configuration_id) : undefined}>
                  {cr.truck_bus_ind === "TRUCK"
                    ? "Truck"
                    : cr.truck_bus_ind === "BUS"
                      ? "Bus"
                      : cr.truck_bus_ind ?? "—"}
                  {cr.vehicle_configuration_id && (
                    <span className="ml-1 text-zinc-600">
                      ({decodeVehicleConfig(cr.vehicle_configuration_id)})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(cr.fatalities ?? "0", 10) > 0 ? (
                    <span className="text-rose-400">{cr.fatalities}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {parseInt(cr.injuries ?? "0", 10) > 0 ? (
                    <span className="text-amber-400">{cr.injuries}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {cr.tow_away ?? "0"}
                </td>
                <td className="hidden px-3 py-2 text-center lg:table-cell">
                  {cr.federal_recordable === "Y" ? (
                    <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400 ring-1 ring-indigo-500/30">
                      Yes
                    </span>
                  ) : cr.federal_recordable === "N" ? (
                    <span className="text-zinc-600">No</span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Shared ──────────────────────────────────────────────────────── */

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-surface-1">
      <div className={`h-0.5 ${warn ? "bg-rose-500" : "bg-indigo-500"}`} />
      <div className="px-4 py-2">
        <p className="text-xs text-zinc-500">{label}</p>
        <p
          className={`text-xl font-semibold ${
            warn ? "text-rose-400" : "text-zinc-100"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
