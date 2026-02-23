"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";
import { BADGE_COLORS, BORDER_COLORS, SkeletonRows } from "./shared";
import { CarrierDetailView } from "./carrier-detail";
import type { SearchResult, CarrierDetail, Tab } from "./types";

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
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <h1 className="relative text-4xl font-semibold sm:text-5xl bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            FMCSA Carrier Lookup
          </h1>
          <p className="relative mt-2 text-sm text-slate-400">
            Search 4.4M FMCSA-registered carriers, brokers &amp; freight
            forwarders by name or DOT number
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
              <p className="text-center text-sm text-rose-400">
                {detailError}
              </p>
            )}
            {detail && (
              <CarrierDetailView
                detail={detail}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
