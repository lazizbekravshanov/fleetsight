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
  blue: "bg-blue-500/20 text-blue-300",
  purple: "bg-purple-500/20 text-purple-300",
  amber: "bg-amber-500/20 text-amber-300",
  slate: "bg-slate-500/20 text-slate-300",
} as const;

const BORDER_COLORS = {
  blue: "border-l-blue-500",
  purple: "border-l-purple-500",
  amber: "border-l-amber-500",
  slate: "border-l-slate-500",
} as const;

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
          className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-5"
        >
          <div className="h-3 w-2/5 rounded-full bg-slate-800" />
          <div className="h-3 w-1/5 rounded-full bg-slate-800" />
          <div className="ml-auto h-3 w-1/6 rounded-full bg-slate-800" />
        </motion.div>
      ))}
    </div>
  );
}

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-blue-400">
            FleetSight
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Search */}
        <div className="relative text-center">
          {/* Radial glow orb */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <h1 className="relative text-4xl font-semibold sm:text-5xl bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            FMCSA Carrier Lookup
          </h1>
          <p className="relative mt-2 text-sm text-slate-400">
            Search 4.4M FMCSA-registered carriers, brokers &amp; freight forwarders by name or DOT number
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mx-auto mt-6 flex max-w-2xl gap-2"
        >
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500"
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
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 pl-11 pr-3 text-base text-slate-100 outline-none placeholder:text-slate-500 transition-shadow focus:shadow-glow"
            />
          </div>
          <motion.button
            type="submit"
            disabled={searching}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-shadow hover:shadow-glow disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </motion.button>
        </form>

        {/* Results */}
        {searched && results.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-10 text-center text-base text-slate-500 tracking-wide"
          >
            No carriers found. Try a different search term.
          </motion.p>
        )}

        {results.length > 0 && (
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="mb-2 text-xs text-slate-400">
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
                    whileHover={{ scale: 1.01 }}
                  >
                    <button
                      onClick={() => handleSelect(r.dotNumber)}
                      className={`flex w-full items-center justify-between rounded-lg border-l-2 ${BORDER_COLORS[badge.color]} px-3 py-2 text-left transition hover:bg-slate-800/60 hover:shadow-panel ${
                        selectedDot === r.dotNumber
                          ? "bg-slate-800/60 ring-1 ring-blue-500/40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {r.legalName}
                          {r.dbaName && (
                            <span className="ml-2 text-slate-500">
                              DBA {r.dbaName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">
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
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-rose-500/20 text-rose-300"
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
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 shadow-panel">
        <div className="h-0.5 bg-gradient-to-r from-blue-500 to-blue-400" />
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {c.legal_name}
              </h2>
              {c.dba_name && (
                <p className="text-sm text-slate-400">DBA {c.dba_name}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
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
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {decodeStatus(c.status_code)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === t.key
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 text-xs text-slate-500">({t.count})</span>
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

/* ── Authority Section ──────────────────────────────────────────── */

function AuthoritySection({ authority, oos }: { authority: unknown; oos: unknown }) {
  const authorityRecords = extractArray(authority, "authority");
  const oosRecords = extractArray(oos, "oos");

  if (authorityRecords.length === 0 && oosRecords.length === 0) {
    return (
      <p className="text-sm text-slate-500 tracking-wide">
        Authority data not available. Ensure FMCSA_WEBKEY is configured to retrieve operating authority details.
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
                <tr key={i} className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30">
                  <td className="px-3 py-2">{str(a.authorityType) || str(a.authTypDesc) || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      str(a.authStatusDesc)?.toUpperCase() === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/20 text-rose-300"
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
                  <tr key={i} className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30">
                    <td className="px-3 py-2">{str(o.oosType) || str(o.oosTypeDesc) || "—"}</td>
                    <td className="px-3 py-2">
                      {str(o.oosDate) || str(o.effectiveDate) ? new Date((str(o.oosDate) || str(o.effectiveDate))!).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {str(o.oosReason) || str(o.oosReasonDesc) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600">
        Insurance details (BIPD, cargo, bond) are not available via public API.
      </p>
    </div>
  );
}

/** Extract array from FMCSA nested response shape */
function extractArray(payload: unknown, key: string): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  // Shape: { content: { <key>: [...] } } or { content: { <key>: { ... } } }
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
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right text-slate-100">{value}</dd>
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
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
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
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-700 text-slate-400">
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
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {insp.insp_date
                    ? new Date(insp.insp_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
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
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Yes
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 text-right lg:table-cell text-slate-500">
                  {insp.gross_comb_veh_wt
                    ? parseInt(insp.gross_comb_veh_wt, 10).toLocaleString()
                    : "—"}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500" title={insp.insp_facility ?? undefined}>
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
      <p className="py-12 text-center text-base text-slate-500 tracking-wide">
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
      <div className="max-h-[32rem] overflow-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-700 text-slate-400">
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
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30 even:bg-slate-900/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date
                    ? new Date(cr.report_date).toLocaleDateString()
                    : "—"}
                  {cr.report_time && (
                    <span className="ml-1 text-slate-600">{cr.report_time}</span>
                  )}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
                  {cr.report_number ?? "—"}
                </td>
                <td className="px-3 py-2">{cr.report_state ?? "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {cr.city ?? "—"}
                </td>
                <td className="hidden px-3 py-2 md:table-cell text-slate-400" title={cr.vehicle_configuration_id ? decodeVehicleConfig(cr.vehicle_configuration_id) : undefined}>
                  {cr.truck_bus_ind === "TRUCK"
                    ? "Truck"
                    : cr.truck_bus_ind === "BUS"
                      ? "Bus"
                      : cr.truck_bus_ind ?? "—"}
                  {cr.vehicle_configuration_id && (
                    <span className="ml-1 text-slate-600">
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
                    <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300">
                      Yes
                    </span>
                  ) : cr.federal_recordable === "N" ? (
                    <span className="text-slate-600">No</span>
                  ) : (
                    <span className="text-slate-600">—</span>
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
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70">
      <div className={`h-0.5 ${warn ? "bg-rose-500" : "bg-blue-500"}`} />
      <div className="px-4 py-2">
        <p className="text-xs text-slate-400">{label}</p>
        <p
          className={`text-xl font-semibold ${
            warn ? "text-rose-400" : "text-slate-100"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
