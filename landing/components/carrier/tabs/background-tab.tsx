"use client";

import { SkeletonRows } from "../shared";
import { AiUpgradePrompt } from "@/components/credits/ai-upgrade-prompt";
import type {
  BackgroundData,
  OfficerCrossRef,
  OfacMatch,
  SamExclusion,
  EdgarFiling,
  CourtCase,
  OcOfficerCompany,
  DigitalFootprint,
  AddressIntelligence,
  OshaViolation,
  EpaEnforcement,
  BankruptcyCase,
  SearchLink,
} from "../types";

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function ShieldCheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path d="M20 4L6 10V19C6 28.05 12.16 36.42 20 38C27.84 36.42 34 28.05 34 19V10L20 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08" />
      <path d="M14 20L18 24L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeader({ icon, title, count, color }: { icon: React.ReactNode; title: string; count?: number; color: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={color}>{icon}</span>
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">{title}</h3>
      {count !== undefined && (
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${color} bg-gray-100 ring-1 ring-gray-200`}>{count}</span>
      )}
    </div>
  );
}

/* ── Minimal SVG Icons ─────────────────────────────────────────────────── */

function UsersIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" /><path d="M1 12C1 9.79 2.79 8 5 8C7.21 8 9 9.79 9 12" stroke="currentColor" strokeWidth="1.3" /><circle cx="10" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 8C12.16 8.5 13 10 13 12" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function ShieldIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1L2 3.5V6.5C2 10.09 4.12 13.35 7 14C9.88 13.35 12 10.09 12 6.5V3.5L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>);
}
function BanIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><path d="M3.1 3.1L10.9 10.9" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function FileTextIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5 7H9M5 9H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>);
}
function GavelIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M4 3L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M2.5 4.5L5.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M9.5 11.5L12.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M1 13H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>);
}
function BuildingIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" /><path d="M5 5H6M8 5H9M5 7.5H6M8 7.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M5.5 12V10H8.5V12" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function MailboxIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 6L7 9L12.5 6" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function GlobeIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 7H12.5" stroke="currentColor" strokeWidth="1.3" /><ellipse cx="7" cy="7" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function HardHatIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 9C2 5.69 4.24 3 7 3C9.76 3 12 5.69 12 9" stroke="currentColor" strokeWidth="1.3" /><path d="M1 9H13V10.5C13 11.05 12.55 11.5 12 11.5H2C1.45 11.5 1 11.05 1 10.5V9Z" stroke="currentColor" strokeWidth="1.3" /><path d="M7 3V1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>);
}
function LeafIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12C2 12 3 3 12 2C12 2 13 11 4 12" stroke="currentColor" strokeWidth="1.3" /><path d="M2 12C5 9 8 6 12 2" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function MapPinIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 13C7 13 12 8.5 12 5.5C12 2.74 9.76 0.5 7 0.5C4.24 0.5 2 2.74 2 5.5C2 8.5 7 13 7 13Z" stroke="currentColor" strokeWidth="1.3" /><circle cx="7" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /></svg>);
}
function ScaleIcon() {
  return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M1 4L7 2L13 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 4L3 9H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M13 4L11 9H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 12H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>);
}

/* ── Link Pill Component ──────────────────────────────────────────────── */

const LINK_COLORS: Record<string, string> = {
  social: "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100",
  business: "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100",
  registry: "bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100",
  search: "bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100",
};

function LinkPill({ link }: { link: SearchLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 transition-colors ${LINK_COLORS[link.category] ?? LINK_COLORS.search}`}
    >
      {link.label}
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </a>
  );
}

/* ── Summary Banner ───────────────────────────────────────────────────── */

function BackgroundSummaryBanner({ data }: { data: BackgroundData }) {
  const totalOfficerRefs = data.officerCrossRefs.reduce((s, o) => s + o.carriers.length, 0);
  const categories = [
    { label: "Officer Cross-Refs", count: totalOfficerRefs, color: "text-indigo-600" },
    { label: "OFAC Matches", count: data.ofacMatches.length, color: "text-rose-600" },
    { label: "SAM Exclusions", count: data.samExclusions.length, color: "text-orange-600" },
    { label: "SEC Filings", count: data.edgarFilings.length, color: "text-blue-600" },
    { label: "Court Cases", count: data.courtCases.length, color: "text-purple-600" },
    { label: "Bankruptcy", count: data.bankruptcyCases.length, color: "text-rose-600" },
    { label: "OSHA", count: data.oshaViolations.length, color: "text-yellow-600" },
    { label: "EPA", count: data.epaEnforcements.length, color: "text-green-600" },
    { label: "Corp. Affiliations", count: data.corporateAffiliations.reduce((s, o) => s + o.companies.length, 0), color: "text-teal-600" },
    { label: "Address Matches", count: data.mailingAddressMatches.length, color: "text-amber-600" },
  ];
  const totalFindings = categories.reduce((s, c) => s + c.count, 0);
  const addressFlags = data.addressIntelligence?.flags.length ?? 0;
  const hasCritical = data.ofacMatches.length > 0 || data.samExclusions.length > 0 || data.bankruptcyCases.length > 0;

  return (
    <div className={`bg-white border shadow-sm rounded-2xl px-5 py-4 ${hasCritical ? "border-rose-200" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-extrabold tabular-nums ${hasCritical ? "text-rose-600" : "text-gray-900"}`}>
            {totalFindings + addressFlags}
          </span>
          <span className="text-sm font-medium text-gray-500">
            background finding{totalFindings + addressFlags !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {categories.filter((c) => c.count > 0).map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold tabular-nums ${c.color}`}>{c.count}</span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
      {data.errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs font-medium text-amber-700">
            Some checks returned partial results: {data.errors.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Digital Footprint Card ───────────────────────────────────────────── */

function DigitalFootprintCard({ footprint }: { footprint: DigitalFootprint }) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<GlobeIcon />} title="Digital Footprint" color="text-sky-500" />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Web presence, business profiles, and registry links.
      </p>

      {/* Website / Email domain */}
      <div className="mb-4 space-y-2">
        {footprint.websiteUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-200 px-4 py-2.5">
            <GlobeIcon />
            <span className="text-xs text-gray-500">Website:</span>
            <a href={footprint.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-sky-700 hover:underline">
              {footprint.websiteDomain}
            </a>
          </div>
        )}
        {footprint.emailDomain && !footprint.websiteDomain && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
            <span className="text-xs text-gray-500">Email domain:</span>
            <span className="text-sm text-gray-700">{footprint.emailDomain}</span>
            <span className="text-[10px] text-gray-400">(free provider)</span>
          </div>
        )}
        {footprint.dnbNumber && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5">
            <span className="text-xs text-gray-500">D&B Number:</span>
            <a href={footprint.dnbUrl!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-700 hover:underline tabular-nums">
              {footprint.dnbNumber}
            </a>
          </div>
        )}
      </div>

      {/* Company search links */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Company Lookup</p>
        <div className="flex flex-wrap gap-1.5">
          {footprint.companySearchLinks.map((link) => (
            <LinkPill key={link.label} link={link} />
          ))}
          {footprint.sosDeepLink && (
            <a href={footprint.sosDeepLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100 transition-colors">
              Sec. of State
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          )}
          {footprint.uccSearchUrl && (
            <a href={footprint.uccSearchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-purple-50 text-purple-700 ring-purple-200 hover:bg-purple-100 transition-colors">
              UCC Filings
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          )}
        </div>
      </div>

      {/* Officer search links */}
      {footprint.officerSearchLinks.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Officer Lookup</p>
          <div className="space-y-3">
            {footprint.officerSearchLinks.map((officer) => (
              <div key={officer.officerName}>
                <p className="text-xs font-semibold text-gray-700 mb-1.5">{officer.officerName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {officer.links.map((link) => (
                    <LinkPill key={link.label} link={link} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Address Intelligence Card ────────────────────────────────────────── */

function AddressIntelligenceCard({ intel }: { intel: AddressIntelligence }) {
  const hasFlags = intel.flags.length > 0;

  return (
    <div className={`bg-white border shadow-sm rounded-2xl p-5 ${hasFlags ? "border-amber-200" : "border-gray-200"}`}>
      <SectionHeader
        icon={<MapPinIcon />}
        title="Address Intelligence"
        count={intel.flags.length > 0 ? intel.flags.length : undefined}
        color={hasFlags ? "text-amber-500" : "text-emerald-500"}
      />

      {intel.flags.length > 0 ? (
        <div className="mb-4 space-y-1.5">
          {intel.flags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2">
              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
              <span className="text-xs text-amber-800">{flag}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5">
          <p className="text-xs text-emerald-700">No address red flags detected.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <a href={intel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100 transition-colors">
          Google Maps
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        <a href={intel.streetViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-gray-50 text-gray-700 ring-gray-200 hover:bg-gray-100 transition-colors">
          Street View
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>
    </div>
  );
}

/* ── OSHA Violations Card ─────────────────────────────────────────────── */

function OshaViolationsCard({ violations }: { violations: OshaViolation[] }) {
  if (violations.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<HardHatIcon />} title="OSHA Violations" color="text-gray-400" />
        <p className="text-xs text-gray-400">No OSHA workplace safety violations found.</p>
      </div>
    );
  }

  const totalPenalties = violations.reduce((s, v) => s + v.penalty, 0);

  return (
    <div className="bg-white border border-yellow-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<HardHatIcon />} title="OSHA Violations" count={violations.length} color="text-yellow-600" />
      {totalPenalties > 0 && (
        <p className="mb-3 -mt-1 text-xs text-gray-500">
          Total penalties: <span className="font-semibold text-yellow-700">${totalPenalties.toLocaleString()}</span>
        </p>
      )}
      <div className="space-y-2">
        {violations.map((v, i) => (
          <div key={i} className="rounded-lg border border-yellow-200 bg-yellow-50 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{v.establishment || "Inspection"}</p>
              {v.penalty > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 tabular-nums">
                  ${v.penalty.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              {v.inspectionDate && <span>{v.inspectionDate}</span>}
              {v.violationType && <><span>&middot;</span><span>{v.violationType}</span></>}
              {v.city && <><span>&middot;</span><span>{v.city}, {v.state}</span></>}
            </div>
            {v.description && <p className="mt-1 text-xs text-gray-500 truncate">{v.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── EPA Enforcement Card ─────────────────────────────────────────────── */

function EpaEnforcementCard({ enforcements }: { enforcements: EpaEnforcement[] }) {
  if (enforcements.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<LeafIcon />} title="EPA Enforcement" color="text-gray-400" />
        <p className="text-xs text-gray-400">No EPA environmental enforcement records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-green-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<LeafIcon />} title="EPA Enforcement" count={enforcements.length} color="text-green-600" />
      <div className="space-y-2">
        {enforcements.map((e, i) => (
          <a
            key={i}
            href={e.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{e.facilityName}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                e.violationStatus.toLowerCase().includes("violation")
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}>
                {e.violationStatus}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              {e.city && <span>{e.city}, {e.state}</span>}
              {e.programAreas.length > 0 && <><span>&middot;</span><span>{e.programAreas.join(", ")}</span></>}
              {e.penalties > 0 && <><span>&middot;</span><span className="text-rose-600 font-semibold">${e.penalties.toLocaleString()}</span></>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Bankruptcy Card ──────────────────────────────────────────────────── */

function BankruptcyCard({ cases }: { cases: BankruptcyCase[] }) {
  if (cases.length === 0) return null;

  return (
    <div className="bg-white border border-rose-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<ScaleIcon />} title="Bankruptcy Records" count={cases.length} color="text-rose-500" />
      <p className="mb-3 -mt-1 text-xs text-gray-400">
        Bankruptcy filings found via federal court records.
      </p>
      <div className="space-y-2">
        {cases.map((c, i) => (
          <a
            key={i}
            href={c.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 hover:bg-rose-100 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900 truncate">{c.caseName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>{c.court}</span>
              {c.chapter !== "unknown" && <><span>&middot;</span><span className="font-semibold text-rose-700">{c.chapter}</span></>}
              {c.docketNumber && <><span>&middot;</span><span className="tabular-nums">{c.docketNumber}</span></>}
              {c.dateFiled && <><span>&middot;</span><span>Filed {c.dateFiled}</span></>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Officer Network Card ─────────────────────────────────────────────── */

function OfficerNetworkCard({ crossRefs }: { crossRefs: OfficerCrossRef[] }) {
  const nonEmpty = crossRefs.filter((r) => r.carriers.length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<UsersIcon />} title="Officer Network" count={nonEmpty.reduce((s, r) => s + r.carriers.length, 0)} color="text-indigo-500" />
      <p className="mb-4 -mt-1 text-xs text-gray-400">Other FMCSA-registered carriers listing the same officers.</p>
      <div className="space-y-4">
        {nonEmpty.map((ref) => (
          <div key={ref.officerName}>
            <p className="text-xs font-semibold text-gray-700 mb-2">{ref.officerName}</p>
            <div className="space-y-1.5">
              {ref.carriers.map((c) => (
                <div key={c.dotNumber} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{c.legalName}</p>
                    <p className="text-[11px] text-gray-400 tabular-nums">DOT {c.dotNumber}</p>
                  </div>
                  {c.statusCode && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.statusCode === "A" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"}`}>
                      {c.statusCode === "A" ? "Active" : "Inactive"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Sanctions Screening Card ─────────────────────────────────────────── */

function SanctionsScreeningCard({ matches }: { matches: OfacMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<ShieldIcon />} title="OFAC Sanctions Screening" color="text-emerald-500" />
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <span className="text-emerald-600"><ShieldCheckIcon /></span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Clear</p>
            <p className="text-xs text-emerald-600">No matches found against OFAC SDN list.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-rose-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<ShieldIcon />} title="OFAC Sanctions Screening" count={matches.length} color="text-rose-500" />
      <p className="mb-3 -mt-1 text-xs text-gray-400">Potential matches against the US Treasury OFAC SDN list. Review carefully.</p>
      <div className="space-y-2">
        {matches.map((m, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{m.matchedName}</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{Math.round(m.score * 100)}% match</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Queried: &quot;{m.queriedName}&quot; &middot; {m.sdnType}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Federal Exclusions Card ──────────────────────────────────────────── */

function FederalExclusionsCard({ exclusions }: { exclusions: SamExclusion[] }) {
  if (exclusions.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<BanIcon />} title="Federal Exclusions (SAM.gov)" color="text-emerald-500" />
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <span className="text-emerald-600"><ShieldCheckIcon /></span>
          <div>
            <p className="text-sm font-medium text-emerald-700">Clear</p>
            <p className="text-xs text-emerald-600">No federal exclusions or debarments found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-orange-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<BanIcon />} title="Federal Exclusions (SAM.gov)" count={exclusions.length} color="text-orange-500" />
      <div className="space-y-2">
        {exclusions.map((e, i) => (
          <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5">
            <p className="text-sm font-medium text-gray-900">{e.name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>{e.classification}</span><span>&middot;</span><span>{e.exclusionType}</span><span>&middot;</span><span>{e.agency}</span>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">{e.activeDateRange}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── SEC Filings Card ─────────────────────────────────────────────────── */

function SecFilingsCard({ filings }: { filings: EdgarFiling[] }) {
  if (filings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<FileTextIcon />} title="SEC Filings (EDGAR)" color="text-gray-400" />
        <p className="text-xs text-gray-400">No SEC filings found for this entity or its officers.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<FileTextIcon />} title="SEC Filings (EDGAR)" count={filings.length} color="text-blue-500" />
      <div className="space-y-2">
        {filings.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{f.formType}</span>
              <span className="text-sm font-medium text-gray-900 truncate">{f.companyName}</span>
            </div>
            {f.dateFiled && <p className="mt-0.5 text-[11px] text-gray-400">Filed {f.dateFiled}</p>}
            {f.description && f.description !== f.formType && <p className="mt-0.5 text-xs text-gray-500 truncate">{f.description}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Court Records Card ───────────────────────────────────────────────── */

function CourtRecordsCard({ cases }: { cases: CourtCase[] }) {
  if (cases.length === 0) {
    return (
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<GavelIcon />} title="Federal Court Records" color="text-gray-400" />
        <p className="text-xs text-gray-400">No federal court records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<GavelIcon />} title="Federal Court Records" count={cases.length} color="text-purple-500" />
      <div className="space-y-2">
        {cases.map((c, i) => (
          <a key={i} href={c.url || undefined} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 hover:bg-purple-50 hover:border-purple-200 transition-colors">
            <p className="text-sm font-medium text-gray-900 truncate">{c.caseName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>{c.court}</span>
              {c.docketNumber && <><span>&middot;</span><span className="tabular-nums">{c.docketNumber}</span></>}
              {c.dateFiled && <><span>&middot;</span><span>Filed {c.dateFiled}</span></>}
              {c.status && c.status !== "unknown" && <><span>&middot;</span><span>{c.status}</span></>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Corporate Affiliations Card ──────────────────────────────────────── */

function CorporateAffiliationsCard({ affiliations }: { affiliations: OcOfficerCompany[] }) {
  if (affiliations.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<BuildingIcon />} title="Corporate Affiliations" count={affiliations.reduce((s, a) => s + a.companies.length, 0)} color="text-teal-500" />
      <p className="mb-4 -mt-1 text-xs text-gray-400">Other companies where these officers hold roles (via OpenCorporates).</p>
      <div className="space-y-4">
        {affiliations.map((aff) => (
          <div key={aff.officerName}>
            <p className="text-xs font-semibold text-gray-700 mb-2">{aff.officerName}</p>
            <div className="space-y-1.5">
              {aff.companies.map((co, i) => (
                <a key={i} href={co.opencorporatesUrl || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 hover:bg-teal-50 hover:border-teal-200 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{co.companyName}</p>
                    <p className="text-[11px] text-gray-400">{co.jurisdiction.toUpperCase()} &middot; #{co.companyNumber}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${co.status.toLowerCase().includes("active") ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-gray-100 text-gray-600 ring-1 ring-gray-300"}`}>
                    {co.status}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Mailing Address Matches Card ─────────────────────────────────────── */

function MailingAddressMatchesCard({ matches }: { matches: { dotNumber: string; legalName: string; statusCode?: string }[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<MailboxIcon />} title="Mailing Address Matches" count={matches.length} color="text-amber-500" />
      <p className="mb-4 -mt-1 text-xs text-gray-400">Other carriers using the same mailing address.</p>
      <div className="space-y-1.5">
        {matches.map((m) => (
          <div key={m.dotNumber} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{m.legalName}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">DOT {m.dotNumber}</p>
            </div>
            {m.statusCode && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.statusCode === "A" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"}`}>
                {m.statusCode === "A" ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Export
   ══════════════════════════════════════════════════════════════════════ */

export function BackgroundTab({
  data,
  loading,
  error,
}: {
  data: BackgroundData | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return <SkeletonRows count={4} />;
  }

  if (error) {
    return <p className="py-12 text-center text-sm text-rose-400">{error}</p>;
  }

  if (!data) {
    return <p className="py-12 text-center text-base text-gray-400 tracking-wide">Background checks will load when this tab is selected.</p>;
  }

  const isEmpty =
    data.officerCrossRefs.every((r) => r.carriers.length === 0) &&
    data.mailingAddressMatches.length === 0 &&
    data.ofacMatches.length === 0 &&
    data.samExclusions.length === 0 &&
    data.edgarFilings.length === 0 &&
    data.courtCases.length === 0 &&
    data.corporateAffiliations.length === 0 &&
    data.oshaViolations.length === 0 &&
    data.epaEnforcements.length === 0 &&
    data.bankruptcyCases.length === 0 &&
    (!data.addressIntelligence || data.addressIntelligence.flags.length === 0) &&
    !data.digitalFootprint;

  if (isEmpty && data.errors.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 text-emerald-600 flex justify-center"><ShieldCheckIcon /></div>
          <p className="text-sm font-medium text-emerald-600">No background findings</p>
          <p className="mt-1.5 text-xs text-gray-400 max-w-xs mx-auto">
            No officer cross-references, sanctions matches, exclusions, violations, court records, or corporate affiliations were found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <BackgroundSummaryBanner data={data} />

      {/* AI Risk Narrative */}
      {data.riskNarrative ? (
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-600/20">AI Analysis</span>
            <span className="text-[10px] text-gray-400">Generated by Claude</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{data.riskNarrative}</p>
        </div>
      ) : data.aiGated?.skipped ? (
        <AiUpgradePrompt reason={data.aiGated.reason} />
      ) : null}

      {/* Digital Footprint & Address Intel side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.digitalFootprint && <DigitalFootprintCard footprint={data.digitalFootprint} />}
        {data.addressIntelligence && <AddressIntelligenceCard intel={data.addressIntelligence} />}
      </div>

      {/* Critical: Sanctions & Exclusions */}
      <OfficerNetworkCard crossRefs={data.officerCrossRefs} />
      <SanctionsScreeningCard matches={data.ofacMatches} />
      <FederalExclusionsCard exclusions={data.samExclusions} />
      <BankruptcyCard cases={data.bankruptcyCases} />

      {/* Regulatory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OshaViolationsCard violations={data.oshaViolations} />
        <EpaEnforcementCard enforcements={data.epaEnforcements} />
      </div>

      {/* Legal & Business */}
      <SecFilingsCard filings={data.edgarFilings} />
      <CourtRecordsCard cases={data.courtCases} />
      <CorporateAffiliationsCard affiliations={data.corporateAffiliations} />
      <MailingAddressMatchesCard matches={data.mailingAddressMatches} />
    </div>
  );
}
