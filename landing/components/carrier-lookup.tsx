"use client";

import { useState } from "react";
import Link from "next/link";
import {
  decodeCarship,
  decodeStatus,
  decodeOperation,
  decodeFleetSize,
  decodeInspectionLevel,
} from "@/lib/fmcsa-codes";
import type { SocrataCarrier, SocrataInspection, SocrataCrash } from "@/lib/socrata";

type SearchResult = {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  statusCode: string | null;
  phyState: string | null;
  powerUnits: number | null;
};

type CarrierDetail = {
  carrier: SocrataCarrier;
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  basics: unknown;
};

type Tab = "overview" | "inspections" | "crashes";

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-blue-400">
            FleetSight
          </p>
          <Link
            href="/login"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Search */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            FMCSA Carrier Lookup
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Search 4.4M FMCSA-registered carriers by name or DOT number
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mx-auto mt-6 flex max-w-2xl gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="DOT number or company name..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none ring-blue-500 placeholder:text-slate-500 focus:ring"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Results */}
        {searched && results.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate-500">
            No carriers found. Try a different search term.
          </p>
        )}

        {results.length > 0 && (
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="mb-2 text-xs text-slate-400">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            <ul className="space-y-1">
              {results.map((r) => (
                <li key={r.dotNumber}>
                  <button
                    onClick={() => handleSelect(r.dotNumber)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-slate-800/60 ${
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
                    {r.statusCode && (
                      <span
                        className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.statusCode === "A"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {decodeStatus(r.statusCode)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detail */}
        {selectedDot && (
          <div className="mt-8">
            {detailLoading && (
              <p className="text-center text-sm text-slate-400">
                Loading carrier details...
              </p>
            )}
            {detailError && (
              <p className="text-center text-sm text-rose-400">{detailError}</p>
            )}
            {detail && <CarrierDetail detail={detail} activeTab={activeTab} setActiveTab={setActiveTab} />}
          </div>
        )}
      </div>
    </main>
  );
}

/* ── Carrier Detail ─────────────────────────────────────────────── */

function CarrierDetail({
  detail,
  activeTab,
  setActiveTab,
}: {
  detail: CarrierDetail;
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
}) {
  const c = detail.carrier;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "inspections", label: "Inspections", count: detail.inspections.length },
    { key: "crashes", label: "Crashes", count: detail.crashes.length },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Carrier Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
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
      <div className="mt-4">
        {activeTab === "overview" && <OverviewTab carrier={c} />}
        {activeTab === "inspections" && (
          <InspectionsTab inspections={detail.inspections} />
        )}
        {activeTab === "crashes" && <CrashesTab crashes={detail.crashes} />}
      </div>
    </div>
  );
}

/* ── Overview Tab ───────────────────────────────────────────────── */

function OverviewTab({ carrier: c }: { carrier: SocrataCarrier }) {
  const address = [c.phy_street, c.phy_city, c.phy_state, c.phy_zip]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Company Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          Company Info
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Legal Name" value={c.legal_name} />
          {c.dba_name && <Row label="DBA Name" value={c.dba_name} />}
          {address && <Row label="Address" value={address} />}
          {c.phone && <Row label="Phone" value={c.phone} />}
          {c.email_address && <Row label="Email" value={c.email_address} />}
          {c.company_officer_1 && (
            <Row label="Officer 1" value={c.company_officer_1} />
          )}
          {c.company_officer_2 && (
            <Row label="Officer 2" value={c.company_officer_2} />
          )}
          {c.add_date && (
            <Row
              label="Operating Since"
              value={new Date(c.add_date).toLocaleDateString()}
            />
          )}
        </dl>
      </div>

      {/* SAFER Stats */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
          SAFER Stats
        </h3>
        <dl className="space-y-2 text-sm">
          <Row label="Status" value={decodeStatus(c.status_code)} />
          <Row
            label="Operation Type"
            value={decodeOperation(c.carrier_operation)}
          />
          <Row label="Fleet Size" value={decodeFleetSize(c.fleetsize)} />
          {c.power_units && <Row label="Power Units" value={c.power_units} />}
          {c.truck_units && <Row label="Trucks" value={c.truck_units} />}
          {c.bus_units && <Row label="Buses" value={c.bus_units} />}
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
    </div>
  );
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
      <p className="py-8 text-center text-sm text-slate-500">
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
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Level</th>
              <th className="px-3 py-2 text-right">Violations</th>
              <th className="px-3 py-2 text-right">OOS</th>
              <th className="hidden px-3 py-2 sm:table-cell">Location</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((insp, i) => (
              <tr
                key={insp.inspection_id ?? i}
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {insp.insp_date
                    ? new Date(insp.insp_date).toLocaleDateString()
                    : "—"}
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
                <td className="hidden px-3 py-2 sm:table-cell text-slate-500">
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
      <p className="py-8 text-center text-sm text-slate-500">
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
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">State</th>
              <th className="hidden px-3 py-2 sm:table-cell">City</th>
              <th className="px-3 py-2 text-right">Fatal</th>
              <th className="px-3 py-2 text-right">Injuries</th>
              <th className="px-3 py-2 text-right">Tow</th>
            </tr>
          </thead>
          <tbody>
            {crashes.map((cr, i) => (
              <tr
                key={cr.crash_id ?? i}
                className="border-b border-slate-800/50 transition hover:bg-slate-800/30"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {cr.report_date
                    ? new Date(cr.report_date).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-3 py-2">{cr.report_state ?? "—"}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  {cr.city ?? "—"}
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
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p
        className={`text-lg font-semibold ${
          warn ? "text-rose-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
