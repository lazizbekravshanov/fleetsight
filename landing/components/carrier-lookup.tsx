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
  blue: "bg-blue-50 text-blue-800 ring-1 ring-blue-200",
  purple: "bg-purple-50 text-purple-800 ring-1 ring-purple-200",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  slate: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
} as const;

const BORDER_COLORS = {
  blue: "border-l-blue-300",
  purple: "border-l-purple-300",
  amber: "border-l-amber-300",
  slate: "border-l-stone-300",
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
    title: "Chameleon Carrier Detection",
    description: "Graph-based algorithm identifies carriers that dissolve and re-register under new identities to evade safety records.",
  },
  {
    title: "BASIC Safety Scores",
    description: "Full Behavior Analysis and Safety Improvement Categories — crash history, inspections, and violations at a glance.",
  },
  {
    title: "FMCSA & USDOT Compliance",
    description: "Authority status, out-of-service orders, operating credentials, and federal registration data — all in one view.",
  },
  {
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
          className="flex items-center gap-4 rounded-xl border border-border bg-surface-1 p-5"
        >
          <div className="h-3 w-2/5 rounded-full bg-surface-3" />
          <div className="h-3 w-1/5 rounded-full bg-surface-3" />
          <div className="ml-auto h-3 w-1/6 rounded-full bg-surface-3" />
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
    <main className="min-h-screen bg-surface-0 text-ink">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <p className="font-serif text-base font-semibold text-ink">
            FleetSight
          </p>
          <span className="text-xs text-ink-muted tracking-wide">
            FMCSA &middot; USDOT
          </span>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6">
        <div className={`text-center transition-all duration-500 ${showLanding ? "pt-24 pb-6" : "pt-10 pb-4"}`}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className={`font-serif font-semibold tracking-tight text-ink transition-all duration-500 ${
              showLanding ? "text-4xl sm:text-5xl" : "text-xl sm:text-2xl"
            }`}>
              {showLanding ? "Carrier intelligence,\u2003simplified." : "FMCSA Carrier Lookup"}
            </h1>

            {showLanding && (
              <p className="mx-auto mt-4 max-w-md text-[15px] text-ink-soft leading-relaxed">
                Search 4.4 million FMCSA-registered carriers, brokers, and freight forwarders.
                Inspect safety records, crash history, and compliance data.
              </p>
            )}
          </motion.div>

          {/* Search Bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`mx-auto flex max-w-xl gap-2 transition-all duration-500 ${
              showLanding ? "mt-8" : "mt-3"
            }`}
          >
            <div className="relative flex-1">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
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
                className="w-full rounded-lg border border-border bg-surface-1 py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink-muted transition-colors focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </motion.form>

          {/* Stats Row */}
          {showLanding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mx-auto mt-10 flex max-w-md justify-between"
            >
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="font-serif text-lg font-semibold text-ink">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-muted uppercase tracking-[0.12em]">
                    {stat.label}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Results Area ────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        {searching && (
          <div className="mt-6">
            <SkeletonRows />
          </div>
        )}

        {searched && results.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 text-center text-sm text-ink-muted"
          >
            No carriers found. Try a different search term.
          </motion.p>
        )}

        {hasResults && (
          <div className="mx-auto mt-4 max-w-xl">
            <p className="mb-2 text-xs text-ink-muted">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            <motion.ul
              key={results.map((r) => r.dotNumber).join()}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
              className="space-y-1"
            >
              {results.map((r) => {
                const badge = entityTypeBadge(r.classdef);
                return (
                  <motion.li
                    key={r.dotNumber}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: { opacity: 1, y: 0 },
                    }}
                  >
                    <button
                      onClick={() => handleSelect(r.dotNumber)}
                      className={`flex w-full items-center justify-between rounded-lg border-l-2 ${BORDER_COLORS[badge.color]} px-3 py-2.5 text-left transition-colors hover:bg-surface-2/60 ${
                        selectedDot === r.dotNumber
                          ? "bg-surface-2/60 ring-1 ring-accent/20"
                          : "bg-surface-1"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {r.legalName}
                          {r.dbaName && (
                            <span className="ml-2 text-ink-muted">
                              DBA {r.dbaName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-ink-muted">
                          DOT {r.dotNumber}
                          {r.phyState && <span className="ml-2">{r.phyState}</span>}
                          {r.powerUnits != null && (
                            <span className="ml-2">
                              {r.powerUnits} power unit{r.powerUnits !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1.5">
                        {r.classdef && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[badge.color]}`}>
                            {badge.label}
                          </span>
                        )}
                        {r.statusCode && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.statusCode === "A"
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                          }`}>
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

        {selectedDot && (
          <motion.div
            key={selectedDot}
            className="mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {detailLoading && <SkeletonRows />}
            {detailError && (
              <p className="text-center text-sm text-rose-700">{detailError}</p>
            )}
            {detail && <CarrierDetailView detail={detail} activeTab={activeTab} setActiveTab={setActiveTab} />}
          </motion.div>
        )}

        {/* ── Landing Content ──────────────────────────────────── */}
        {showLanding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            {/* Info Section */}
            <div className="mt-20 border-t border-border pt-14">
              <div className="mx-auto max-w-xl text-center">
                <p className="font-serif text-xl font-semibold text-ink">
                  The problem
                </p>
                <p className="mt-4 text-sm text-ink-soft leading-relaxed">
                  Every year, commercial vehicle crashes kill approximately 5,000 people
                  and injure over 160,000 in the United States. Unsafe carriers with
                  documented crash histories and safety violations can dissolve their
                  companies and re-register under new names — effectively resetting their
                  records. FMCSA has no automated system to detect this.
                </p>
              </div>
              <div className="mx-auto mt-10 max-w-xl text-center">
                <p className="font-serif text-xl font-semibold text-ink">
                  How FleetSight helps
                </p>
                <p className="mt-4 text-sm text-ink-soft leading-relaxed">
                  FleetSight indexes the full 4.4 million record FMCSA national carrier
                  registry and applies graph-based entity resolution to detect chameleon
                  carriers — operators who share phone numbers, addresses, EINs, and
                  principals with previously flagged entities. It gives freight brokers,
                  insurers, and compliance teams the intelligence to identify high-risk
                  carriers before contracting — not after a preventable incident.
                </p>
              </div>
            </div>

            <div className="mt-20 border-t border-border pt-14">
              <p className="mb-8 text-center font-serif text-xl font-semibold text-ink">
                What FleetSight does
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl border border-border bg-surface-1 p-5 transition-colors hover:border-border-hover"
                  >
                    <h3 className="mb-1.5 text-sm font-semibold text-ink">
                      {f.title}
                    </h3>
                    <p className="text-sm text-ink-soft leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-20 border-t border-border pt-12 text-center">
              <p className="mb-5 font-serif text-lg font-semibold text-ink">
                Built on public federal data
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {["FMCSA", "USDOT", "SAFER", "NHTSA"].map((source) => (
                  <span
                    key={source}
                    className="text-sm font-medium tracking-wide text-ink-muted"
                  >
                    {source}
                  </span>
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-md text-sm text-ink-soft leading-relaxed">
                FleetSight indexes the complete FMCSA national carrier registry — 4.4 million records.
                All data sourced from publicly available federal safety datasets.
              </p>
            </div>

            <div className="mt-16 border-t border-border pt-6 text-center">
              <p className="text-xs text-ink-muted">
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
      <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-sm">
        <div className="h-0.5 bg-accent" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                {c.legal_name}
              </h2>
              {c.dba_name && <p className="text-sm text-ink-soft">DBA {c.dba_name}</p>}
              <p className="mt-1 text-xs text-ink-muted">USDOT {c.dot_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE_COLORS[badge.color]}`}>
                {badge.label}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.status_code === "A"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
              }`}>
                {decodeStatus(c.status_code)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === t.key
                ? "border-b-2 border-accent text-accent"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 text-xs text-ink-muted">({t.count})</span>}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          {activeTab === "overview" && <OverviewTab carrier={c} authority={detail.authority} oos={detail.oos} />}
          {activeTab === "inspections" && <InspectionsTab inspections={detail.inspections} />}
          {activeTab === "crashes" && <CrashesTab crashes={detail.crashes} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────────── */

function OverviewTab({ carrier: c, authority, oos }: { carrier: SocrataCarrier; authority: unknown; oos: unknown }) {
  const address = [c.phy_street, c.phy_city, c.phy_state, c.phy_zip].filter(Boolean).join(", ");
  const mailingAddress = [c.carrier_mailing_street, c.carrier_mailing_city, c.carrier_mailing_state, c.carrier_mailing_zip].filter(Boolean).join(", ");
  const classifications = decodeClassdef(c.classdef);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Company Info
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Legal Name" value={c.legal_name} />
          {c.dba_name && <Row label="DBA Name" value={c.dba_name} />}
          {address && <Row label="Physical Address" value={address} />}
          {mailingAddress && mailingAddress !== address && <Row label="Mailing Address" value={mailingAddress} />}
          {c.phone && <Row label="Phone" value={c.phone} />}
          {c.cell_phone && <Row label="Cell Phone" value={c.cell_phone} />}
          {c.fax && <Row label="Fax" value={c.fax} />}
          {c.email_address && <Row label="Email" value={c.email_address} />}
          {c.company_officer_1 && <Row label="Officer 1" value={c.company_officer_1} />}
          {c.company_officer_2 && <Row label="Officer 2" value={c.company_officer_2} />}
          {c.business_org_desc && <Row label="Entity Type" value={c.business_org_desc} />}
          {c.dun_bradstreet_no && <Row label="D&B Number" value={c.dun_bradstreet_no} />}
          {c.add_date && <Row label="Operating Since" value={new Date(c.add_date).toLocaleDateString()} />}
          {c.mcs150_date && <Row label="MCS-150 Date" value={new Date(c.mcs150_date).toLocaleDateString()} />}
          {c.mcs150_mileage && <Row label="MCS-150 Mileage" value={`${parseInt(c.mcs150_mileage, 10).toLocaleString()} mi${c.mcs150_mileage_year ? ` (${c.mcs150_mileage_year})` : ""}`} />}
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-5">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          SAFER Stats
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Status" value={decodeStatus(c.status_code)} />
          <Row label="Operation Type" value={decodeOperation(c.carrier_operation)} />
          {classifications.length > 0 && <Row label="Classification" value={classifications.join(", ")} />}
          <Row label="Fleet Size" value={decodeFleetSize(c.fleetsize)} />
          {c.power_units && <Row label="Power Units" value={c.power_units} />}
          {c.truck_units && <Row label="Trucks" value={c.truck_units} />}
          {c.bus_units && <Row label="Buses" value={c.bus_units} />}
          {c.owntract && <Row label="Owned Tractors" value={c.owntract} />}
          {c.owntrail && <Row label="Owned Trailers" value={c.owntrail} />}
          {c.owntruck && <Row label="Owned Trucks" value={c.owntruck} />}
          {c.total_drivers && <Row label="Total Drivers" value={c.total_drivers} />}
          {c.total_cdl && <Row label="CDL Holders" value={c.total_cdl} />}
          <Row label="Hazmat" value={c.hm_ind === "Y" ? "Yes" : "No"} />
          {c.carship && <Row label="Cargo Carried" value={decodeCarship(c.carship).join(", ")} />}
          {c.docket1 && <Row label="Docket" value={`${c.docket1prefix ?? ""}${c.docket1}`} />}
        </dl>
      </div>

      <div className="rounded-xl border border-border bg-surface-1 p-5 md:col-span-2">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
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
    return <p className="text-sm text-ink-muted">Authority data not available. Ensure FMCSA_WEBKEY is configured to retrieve operating authority details.</p>;
  }

  return (
    <div className="space-y-4">
      {authorityRecords.length > 0 && (
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-xs text-ink-soft">
            <thead className="sticky top-0 bg-surface-2">
              <tr className="border-b border-border text-ink-muted">
                <th className="px-3 py-2">Authority Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Granted Date</th>
                <th className="hidden px-3 py-2 sm:table-cell">Docket</th>
              </tr>
            </thead>
            <tbody>
              {authorityRecords.map((a, i) => (
                <tr key={i} className="border-b border-border transition hover:bg-surface-2/60 even:bg-surface-2/30">
                  <td className="px-3 py-2">{str(a.authorityType) || str(a.authTypDesc) || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      str(a.authStatusDesc)?.toUpperCase() === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                        : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                    }`}>
                      {str(a.authStatusDesc) || str(a.authStatus) || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{str(a.authGrantDate) ? new Date(str(a.authGrantDate)!).toLocaleDateString() : "—"}</td>
                  <td className="hidden px-3 py-2 sm:table-cell">{str(a.docketNbr) || str(a.docketPrefix) ? `${str(a.docketPrefix) ?? ""}${str(a.docketNbr) ?? ""}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {oosRecords.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Out-of-Service Orders</h4>
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-left text-xs text-ink-soft">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="border-b border-border text-ink-muted">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Effective Date</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {oosRecords.map((o, i) => (
                  <tr key={i} className="border-b border-border transition hover:bg-surface-2/60 even:bg-surface-2/30">
                    <td className="px-3 py-2">{str(o.oosType) || str(o.oosTypeDesc) || "—"}</td>
                    <td className="px-3 py-2">{str(o.oosDate) || str(o.effectiveDate) ? new Date((str(o.oosDate) || str(o.effectiveDate))!).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2 text-ink-muted">{str(o.oosReason) || str(o.oosReasonDesc) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted">Insurance details (BIPD, cargo, bond) are not available via public API.</p>
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
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

/* ── Inspections Tab ────────────────────────────────────────────── */

function InspectionsTab({ inspections }: { inspections: SocrataInspection[] }) {
  if (inspections.length === 0) return <p className="py-12 text-center text-sm text-ink-muted">No inspection records found.</p>;

  const totalViols = inspections.reduce((s, i) => s + (parseInt(i.viol_total ?? "0", 10) || 0), 0);
  const totalOos = inspections.reduce((s, i) => s + (parseInt(i.oos_total ?? "0", 10) || 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Stat label="Total Inspections" value={inspections.length} />
        <Stat label="Total Violations" value={totalViols} />
        <Stat label="Out of Service" value={totalOos} />
        <Stat label="OOS Rate" value={inspections.length > 0 ? `${((totalOos / inspections.length) * 100).toFixed(1)}%` : "N/A"} />
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs text-ink-soft">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-border text-ink-muted">
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
              <tr key={insp.inspection_id ?? i} className="border-b border-border transition hover:bg-surface-2/60 even:bg-surface-2/30">
                <td className="px-3 py-2 whitespace-nowrap">{insp.insp_date ? new Date(insp.insp_date).toLocaleDateString() : "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell text-ink-muted">{insp.report_number ?? "—"}</td>
                <td className="px-3 py-2">{insp.report_state ?? "—"}</td>
                <td className="px-3 py-2">{decodeInspectionLevel(insp.insp_level_id)}</td>
                <td className="px-3 py-2 text-right">{insp.viol_total ?? "0"}</td>
                <td className="px-3 py-2 text-right">{parseInt(insp.oos_total ?? "0", 10) > 0 ? <span className="text-rose-700">{insp.oos_total}</span> : "0"}</td>
                <td className="hidden px-3 py-2 text-center md:table-cell">
                  {insp.post_acc_ind === "Y" ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">Yes</span> : <span className="text-ink-muted">—</span>}
                </td>
                <td className="hidden px-3 py-2 text-right lg:table-cell text-ink-muted">{insp.gross_comb_veh_wt ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString() : "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell text-ink-muted" title={insp.insp_facility ?? undefined}>{insp.location_desc ?? "—"}</td>
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
  if (crashes.length === 0) return <p className="py-12 text-center text-sm text-ink-muted">No crash records found.</p>;

  const totalFatalities = crashes.reduce((s, c) => s + (parseInt(c.fatalities ?? "0", 10) || 0), 0);
  const totalInjuries = crashes.reduce((s, c) => s + (parseInt(c.injuries ?? "0", 10) || 0), 0);
  const totalTowAway = crashes.reduce((s, c) => s + (parseInt(c.tow_away ?? "0", 10) || 0), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Stat label="Total Crashes" value={crashes.length} />
        <Stat label="Fatalities" value={totalFatalities} warn />
        <Stat label="Injuries" value={totalInjuries} warn={totalInjuries > 0} />
        <Stat label="Tow-Aways" value={totalTowAway} />
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs text-ink-soft">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-border text-ink-muted">
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
              <tr key={cr.crash_id ?? i} className="border-b border-border transition hover:bg-surface-2/60 even:bg-surface-2/30">
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date ? new Date(cr.report_date).toLocaleDateString() : "—"}
                  {cr.report_time && <span className="ml-1 text-ink-muted">{cr.report_time}</span>}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-ink-muted">{cr.report_number ?? "—"}</td>
                <td className="px-3 py-2">{cr.report_state ?? "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">{cr.city ?? "—"}</td>
                <td className="hidden px-3 py-2 md:table-cell text-ink-muted" title={cr.vehicle_configuration_id ? decodeVehicleConfig(cr.vehicle_configuration_id) : undefined}>
                  {cr.truck_bus_ind === "TRUCK" ? "Truck" : cr.truck_bus_ind === "BUS" ? "Bus" : cr.truck_bus_ind ?? "—"}
                  {cr.vehicle_configuration_id && <span className="ml-1 text-ink-muted">({decodeVehicleConfig(cr.vehicle_configuration_id)})</span>}
                </td>
                <td className="px-3 py-2 text-right">{parseInt(cr.fatalities ?? "0", 10) > 0 ? <span className="text-rose-700">{cr.fatalities}</span> : "0"}</td>
                <td className="px-3 py-2 text-right">{parseInt(cr.injuries ?? "0", 10) > 0 ? <span className="text-amber-700">{cr.injuries}</span> : "0"}</td>
                <td className="px-3 py-2 text-right">{cr.tow_away ?? "0"}</td>
                <td className="hidden px-3 py-2 text-center lg:table-cell">
                  {cr.federal_recordable === "Y" ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">Yes</span>
                  ) : cr.federal_recordable === "N" ? <span className="text-ink-muted">No</span> : <span className="text-ink-muted">—</span>}
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

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-1">
      <div className={`h-0.5 ${warn ? "bg-rose-500" : "bg-accent"}`} />
      <div className="px-4 py-2">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={`text-xl font-semibold ${warn ? "text-rose-700" : "text-ink"}`}>{value}</p>
      </div>
    </div>
  );
}
