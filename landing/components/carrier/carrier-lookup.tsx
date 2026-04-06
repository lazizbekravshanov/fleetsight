"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { decodeStatus, entityTypeBadge } from "@/lib/fmcsa-codes";
import { BADGE_COLORS, BORDER_COLORS } from "./shared";
import {
  Shield, ClipboardList, Eye, Truck, Building2, Sparkles,
  Briefcase, Package, ShieldCheck, CheckSquare,
} from "lucide-react";
import type { SearchResult } from "./types";

const RISK_GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  B: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20",
  C: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
  D: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
  F: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
};

const EXAMPLE_QUERIES = [
  "50+ trucks in Texas",
  "hazmat carriers in Ohio",
  "new carriers with over 100 trucks",
  "freight brokers in Florida",
  "large carriers in New York",
  "sole proprietorship trucking in Georgia",
];

/* ── Landing page content ─────────────────────────────────────────── */

const FEATURES = [
  {
    title: "Safety & BASIC Scores",
    desc: "Full BASIC percentile breakdown with intervention thresholds. Understand crash risk, HOS compliance, and vehicle maintenance scores at a glance.",
    icon: <Shield className="h-[18px] w-[18px]" />,
  },
  {
    title: "Inspection & Violation History",
    desc: "Every roadside inspection on record with driver and vehicle violations, OOS rates, state heatmaps, and level distribution analysis.",
    icon: <ClipboardList className="h-[18px] w-[18px]" />,
  },
  {
    title: "Chameleon Carrier Detection",
    desc: "7-signal scoring algorithm detects carriers that re-register to shed safety records. Shared VIN tracking, temporal analysis, and network clustering.",
    icon: <Eye className="h-[18px] w-[18px]" />,
  },
  {
    title: "Fleet & VIN Intelligence",
    desc: "Track every vehicle in a carrier's fleet by VIN. NHTSA recall alerts, complaint flags, make/model decoding, and cross-carrier VIN transfers.",
    icon: <Truck className="h-[18px] w-[18px]" />,
  },
  {
    title: "Background & Compliance Checks",
    desc: "OFAC sanctions screening, SAM.gov exclusions, SEC filings, federal court records, OSHA violations, and corporate network analysis in one view.",
    icon: <Building2 className="h-[18px] w-[18px]" />,
  },
  {
    title: "AI-Powered Search",
    desc: 'Search in plain English \u2014 "hazmat carriers in Ohio with 50+ trucks" works. Claude-powered query translation turns natural language into precise results.',
    icon: <Sparkles className="h-[18px] w-[18px]" />,
  },
];

const AUDIENCES = [
  {
    title: "Freight Brokers",
    desc: "Vet carriers before tendering loads. Spot double-brokering signals and chameleon carriers instantly.",
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    title: "Shippers & 3PLs",
    desc: "Ensure every carrier in your routing guide meets safety thresholds. Continuous monitoring catches compliance changes.",
    icon: <Package className="h-5 w-5" />,
  },
  {
    title: "Insurance Underwriters",
    desc: "Assess fleet risk with composite scores, crash severity analysis, and historical violation trends for accurate premium setting.",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    title: "Compliance Teams",
    desc: "Monitor your own authority, track fleet inspections, and get alerted to BASIC score changes before they become interventions.",
    icon: <CheckSquare className="h-5 w-5" />,
  },
];

const STEPS = [
  {
    title: "Search any carrier",
    desc: "Enter a DOT number, MC number, company name, or a plain-English query like \"large hazmat carriers in Texas.\" FleetSight searches 4.4 million FMCSA registrations in under a second.",
  },
  {
    title: "Get the full intelligence picture",
    desc: "See safety scores, inspection history with state heatmaps, crash records, insurance status, fleet vehicles with VIN tracking, chameleon detection signals, and background checks \u2014 all in one view.",
  },
  {
    title: "Monitor and act",
    desc: "Add carriers to your watchlist for continuous monitoring. Get alerts on authority revocations, OOS orders, insurance lapses, and BASIC score spikes. Export data, generate reports, and integrate with your TMS.",
  },
];

function updateUrl(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
    else url.searchParams.delete(k);
  }
  window.history.replaceState(null, "", url.toString());
}

export function CarrierLookup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedDot, setSelectedDot] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<"standard" | "natural" | "ai">("standard");
  const [searchDescription, setSearchDescription] = useState<string | null>(null);
  const [aiSkipped, setAiSkipped] = useState<"not_authenticated" | "no_credits" | null>(null);

  const doSearch = useCallback(async (q: string) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setSearched(false);
    setSelectedDot(null);
    try {
      const res = await fetch(
        `/api/carrier/search?q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`Search returned ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
      setSearchMode(data.searchMode || "standard");
      setSearchDescription(data.searchDescription || null);
      setAiSkipped(data.aiSkipped || null);
      setSearched(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // Superseded by newer search
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced typeahead: auto-search as user types (300ms delay, min 2 chars)
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    debounceRef.current = setTimeout(() => {
      updateUrl({ q: trimmed, dot: null });
      doSearch(trimmed);
    }, 300);
  }, [doSearch]);

  // Initialize from URL params on mount. ?dot=N shortcut now routes to the
  // Investigator console (the inline detail view was retired in the agentic
  // pivot — search → click → /console/[dot]).
  useEffect(() => {
    const q = searchParams.get("q");
    const dot = searchParams.get("dot");
    if (dot && /^\d{1,10}$/.test(dot)) {
      router.push(`/console/${dot}`);
      return;
    }
    if (q) {
      setQuery(q);
      doSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: / to focus search, Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (
        e.key === "/" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;
    updateUrl({ q: query.trim(), dot: null });
    await doSearch(query.trim());
  }

  function handleSelect(dotNumber: number) {
    // Agentic pivot: clicking a search result opens the Investigator console.
    // The console auto-briefs the carrier (parallel tool sweep + decision card).
    setSelectedDot(dotNumber);
    router.push(`/console/${dotNumber}`);
  }

  function handleExampleClick(example: string) {
    setQuery(example);
    updateUrl({ q: example, dot: null });
    doSearch(example);
  }

  const showLanding = !searched && !selectedDot;

  return (
    <main className="min-h-screen bg-[var(--surface-2)] text-[var(--ink)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--surface-1)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-sm font-semibold tracking-wide text-accent">
            FleetSight
          </p>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            100% Free
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Hero + Search */}
        <div className="text-center">
          {showLanding ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
                Carrier Intelligence Platform
              </p>
              <h1 className="text-4xl font-semibold text-[var(--ink)] sm:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>
                Know every carrier<br className="hidden sm:block" /> before they touch your freight
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--ink-soft)] leading-relaxed">
                FleetSight gives freight brokers, shippers, and compliance teams instant access to
                deep safety intelligence on 4.4 million FMCSA-registered carriers &mdash; inspections, crash
                records, insurance, chameleon detection, and more. No signup required.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-semibold text-[var(--ink)] sm:text-5xl">
                FMCSA Carrier Lookup
              </h1>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                Search 4.4M FMCSA-registered carriers, brokers &amp; freight
                forwarders by name, DOT number, or MC number
              </p>
            </>
          )}
        </div>

        <form
          onSubmit={handleSearch}
          role="search"
          className="mx-auto mt-6 flex max-w-2xl gap-2"
        >
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--ink-muted)]"
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
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="DOT, MC, company name, or try &quot;large carriers in Texas&quot;..."
              aria-label="Search carriers by name, DOT number, MC number, or natural language"
              className="w-full rounded-xl border border-border bg-[var(--surface-1)] py-3 pl-11 pr-3 text-base text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
        <div className="mx-auto mt-1.5 max-w-2xl flex items-center justify-between">
          <p className="text-xs text-[var(--ink-muted)]">
            Press <kbd className="rounded border border-border bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-soft)]">/</kbd> to search
          </p>
        </div>

        {/* Example query chips */}
        {showLanding && (
          <div className="mx-auto mt-3 max-w-2xl">
            <p className="mb-1.5 text-xs text-[var(--ink-muted)]">Try a smart search:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map((eq) => (
                <button
                  key={eq}
                  onClick={() => handleExampleClick(eq)}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--ink-soft)] transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Landing content (visible before first search) ──────────── */}
        {showLanding && (
          <>
            {/* Stat ribbon */}
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: "4.4M", label: "Registered Carriers" },
                { value: "13M+", label: "VIN Observations" },
                { value: "8M+", label: "Inspection Records" },
                { value: "100%", label: "Free, No Signup" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-4 text-center"
                >
                  <p className="text-2xl font-bold text-accent">{s.value}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{s.label}</p>
                </div>
              ))}
            </div>

            {/* What is FleetSight */}
            <section className="mx-auto mt-16 max-w-4xl">
              <h2 className="text-center text-2xl font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
                Deep carrier intelligence, completely free
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--ink-soft)] leading-relaxed">
                FleetSight aggregates public FMCSA, DOT, and NHTSA data into a single intelligence layer.
                Every lookup gives you the full picture &mdash; not just a safety rating, but the context
                behind it.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                      {f.icon}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[var(--ink)]">{f.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">{f.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Who it helps */}
            <section className="mx-auto mt-16 max-w-4xl">
              <h2 className="text-center text-2xl font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
                Built for the people who move freight
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {AUDIENCES.map((a) => (
                  <div key={a.title} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent text-lg">
                      {a.icon}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[var(--ink)]">{a.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">{a.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section className="mx-auto mt-16 max-w-3xl">
              <h2 className="text-center text-2xl font-semibold text-[var(--ink)]" style={{ fontFamily: "var(--font-serif)" }}>
                Three steps to carrier clarity
              </h2>
              <div className="mt-8 space-y-4">
                {STEPS.map((step, i) => (
                  <div key={step.title} className="flex gap-4 items-start rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white text-sm font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ink)]">{step.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Data sources */}
            <section className="mx-auto mt-16 max-w-3xl mb-8">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-muted)] mb-3">
                  Powered by public data
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[var(--ink-soft)]">
                  <span>FMCSA Safety &amp; Fitness</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>DOT Inspections &amp; Crashes</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>NHTSA Vehicle Data</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>OFAC &amp; SAM.gov</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>SEC EDGAR</span>
                  <span className="text-[var(--border)]">|</span>
                  <span>Court Records</span>
                </div>
                <p className="mt-3 text-[11px] text-[var(--ink-muted)]">
                  All data sourced directly from federal agencies. Updated daily. No third-party data brokers.
                </p>
              </div>
            </section>
          </>
        )}

        {/* Search mode indicator + description */}
        {searched && (searchMode === "natural" || searchMode === "ai") && searchDescription && (
          <div className="mx-auto mt-4 max-w-2xl flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ${
              searchMode === "ai"
                ? "bg-violet-50 text-violet-700 ring-violet-600/20"
                : "bg-accent-soft text-accent ring-accent/20"
            }`}>
              {searchMode === "ai" ? "AI Search" : "Smart Search"}
            </span>
            <span className="text-xs text-[var(--ink-soft)]">{searchDescription}</span>
          </div>
        )}

        {/* AI search is free for all users */}

        {/* Skeleton loading state */}
        {searching && !searched && (
          <div className="mx-auto mt-6 max-w-2xl space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border-l-2 border-[var(--border)] px-3 py-2.5"
                style={{ opacity: 1 - i * 0.15 }}
              >
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 rounded bg-surface-3 animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-surface-3 animate-pulse" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 rounded-full bg-surface-3 animate-pulse" />
                  <div className="h-5 w-12 rounded-full bg-surface-3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {searched && results.length === 0 && !searching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto mt-10 max-w-md text-center"
          >
            <svg
              className="mx-auto h-12 w-12 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 10.5L10.5 7.5m0 3l3-3"
              />
            </svg>
            <h3 className="mt-3 text-base font-medium text-[var(--ink)]">
              No carriers found
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--ink-soft)]">
              <li>Try searching by DOT number</li>
              <li>Check spelling of company name</li>
              <li>
                Use partial names (e.g., &quot;Swift&quot; instead of
                &quot;Swift Transportation&quot;)
              </li>
            </ul>
          </motion.div>
        )}

        {results.length > 0 && (
          <div className="mx-auto mt-6 max-w-2xl">
            <p className="mb-2 text-xs text-[var(--ink-soft)]">
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
                      className={`flex w-full items-center justify-between rounded-lg border-l-2 ${BORDER_COLORS[badge.color]} px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)] ${
                        selectedDot === r.dotNumber
                          ? "bg-[var(--surface-2)] ring-1 ring-accent/40"
                          : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-[var(--ink)]">
                          {r.statusCode && r.statusCode !== "A" && (
                            <svg className="h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="truncate">{r.legalName}</span>
                          {r.dbaName && (
                            <span className="ml-2 text-[var(--ink-muted)]">
                              DBA {r.dbaName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-[var(--ink-soft)]">
                          DOT {r.dotNumber}
                          {r.mcNumber && (
                            <span className="ml-2">{r.mcNumber}</span>
                          )}
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
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
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
      </div>
    </main>
  );
}
