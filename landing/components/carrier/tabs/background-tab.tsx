"use client";

import { SkeletonRows } from "../shared";
import { AiUpgradePrompt } from "@/components/credits/ai-upgrade-prompt";
import type {
  BackgroundData,
  OfficerProfile,
  OcOfficerRole,
  OfficerCrossRef,
  OfacMatch,
  SamExclusion,
  EdgarFiling,
  CourtCase,
  OcOfficerCompany,
  CorporateNetwork,
  OcCompanyDetail,
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
      <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">{title}</h3>
      {count !== undefined && (
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${color} bg-[var(--surface-2)] ring-1 ring-border`}>{count}</span>
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
  search: "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-border hover:bg-[var(--surface-2)]",
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
  const profiles = data.officerProfiles ?? [];
  const totalCarrierRefs = profiles.reduce((s, p) => s + p.carrierRefs.length, 0);
  const totalCorpRoles = profiles.reduce((s, p) => s + p.corporateRoles.length, 0);
  const categories = [
    { label: "Carrier Cross-Refs", count: totalCarrierRefs, color: "text-accent" },
    { label: "Corp. Roles", count: totalCorpRoles, color: "text-teal-600" },
    { label: "OFAC Matches", count: data.ofacMatches.length, color: "text-rose-600" },
    { label: "SAM Exclusions", count: data.samExclusions.length, color: "text-orange-600" },
    { label: "SEC Filings", count: data.edgarFilings.length, color: "text-blue-600" },
    { label: "Court Cases", count: data.courtCases.length, color: "text-purple-600" },
    { label: "Bankruptcy", count: data.bankruptcyCases.length, color: "text-rose-600" },
    { label: "OSHA", count: data.oshaViolations.length, color: "text-yellow-600" },
    { label: "EPA", count: data.epaEnforcements.length, color: "text-green-600" },
    { label: "Address Matches", count: data.mailingAddressMatches.length, color: "text-amber-600" },
    { label: "State Registrations", count: data.corporateNetwork?.companyRegistrations.length ?? 0, color: "text-accent" },
  ];
  const totalFindings = categories.reduce((s, c) => s + c.count, 0);
  const addressFlags = data.addressIntelligence?.flags.length ?? 0;
  const hasCritical =
    data.ofacMatches.length > 0 ||
    data.samExclusions.length > 0 ||
    data.bankruptcyCases.length > 0 ||
    (data.corporateNetwork?.riskSignals.some((s) => s.severity === "high") ?? false);

  return (
    <div className={`bg-[var(--surface-1)] border shadow-sm rounded-2xl px-5 py-4 ${hasCritical ? "border-rose-200" : "border-[var(--border)]"}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-extrabold tabular-nums ${hasCritical ? "text-rose-600" : "text-[var(--ink)]"}`}>
            {totalFindings + addressFlags}
          </span>
          <span className="text-sm font-medium text-[var(--ink-soft)]">
            background finding{totalFindings + addressFlags !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {categories.filter((c) => c.count > 0).map((c) => (
            <div key={c.label} className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold tabular-nums ${c.color}`}>{c.count}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)]">{c.label}</span>
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
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<GlobeIcon />} title="Digital Footprint" color="text-sky-500" />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">
        Web presence, business profiles, and registry links.
      </p>

      {/* Website / Email domain */}
      <div className="mb-4 space-y-2">
        {footprint.websiteUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-200 px-4 py-2.5">
            <GlobeIcon />
            <span className="text-xs text-[var(--ink-soft)]">Website:</span>
            <a href={footprint.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-sky-700 hover:underline">
              {footprint.websiteDomain}
            </a>
          </div>
        )}
        {footprint.emailDomain && !footprint.websiteDomain && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2.5">
            <span className="text-xs text-[var(--ink-soft)]">Email domain:</span>
            <span className="text-sm text-[var(--ink-soft)]">{footprint.emailDomain}</span>
            <span className="text-[10px] text-[var(--ink-muted)]">(free provider)</span>
          </div>
        )}
        {footprint.dnbNumber && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-4 py-2.5">
            <span className="text-xs text-[var(--ink-soft)]">D&B Number:</span>
            <a href={footprint.dnbUrl!} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-accent hover:underline tabular-nums">
              {footprint.dnbNumber}
            </a>
          </div>
        )}
      </div>

      {/* Company search links */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-soft)] mb-2">Company Lookup</p>
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-soft)] mb-2">Officer Lookup</p>
          <div className="space-y-3">
            {footprint.officerSearchLinks.map((officer) => (
              <div key={officer.officerName}>
                <p className="text-xs font-semibold text-[var(--ink-soft)] mb-1.5">{officer.officerName}</p>
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
    <div className={`bg-[var(--surface-1)] border shadow-sm rounded-2xl p-5 ${hasFlags ? "border-amber-200" : "border-[var(--border)]"}`}>
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
        <a href={intel.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-[var(--surface-2)] text-[var(--ink-soft)] ring-border hover:bg-[var(--surface-2)] transition-colors">
          Google Maps
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50"><path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        <a href={intel.streetViewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 bg-[var(--surface-2)] text-[var(--ink-soft)] ring-border hover:bg-[var(--surface-2)] transition-colors">
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<HardHatIcon />} title="OSHA Violations" color="text-[var(--ink-muted)]" />
        <p className="text-xs text-[var(--ink-muted)]">No OSHA workplace safety violations found.</p>
      </div>
    );
  }

  const totalPenalties = violations.reduce((s, v) => s + v.penalty, 0);

  return (
    <div className="bg-[var(--surface-1)] border border-yellow-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<HardHatIcon />} title="OSHA Violations" count={violations.length} color="text-yellow-600" />
      {totalPenalties > 0 && (
        <p className="mb-3 -mt-1 text-xs text-[var(--ink-soft)]">
          Total penalties: <span className="font-semibold text-yellow-700">${totalPenalties.toLocaleString()}</span>
        </p>
      )}
      <div className="space-y-2">
        {violations.map((v, i) => (
          <div key={i} className="rounded-lg border border-yellow-200 bg-yellow-50 px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-[var(--ink)] truncate">{v.establishment || "Inspection"}</p>
              {v.penalty > 0 && (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-800 tabular-nums">
                  ${v.penalty.toLocaleString()}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
              {v.inspectionDate && <span>{v.inspectionDate}</span>}
              {v.violationType && <><span>&middot;</span><span>{v.violationType}</span></>}
              {v.city && <><span>&middot;</span><span>{v.city}, {v.state}</span></>}
            </div>
            {v.description && <p className="mt-1 text-xs text-[var(--ink-soft)] truncate">{v.description}</p>}
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<LeafIcon />} title="EPA Enforcement" color="text-[var(--ink-muted)]" />
        <p className="text-xs text-[var(--ink-muted)]">No EPA environmental enforcement records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-green-200 shadow-sm rounded-2xl p-5">
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
              <p className="text-sm font-medium text-[var(--ink)] truncate">{e.facilityName}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                e.violationStatus.toLowerCase().includes("violation")
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}>
                {e.violationStatus}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
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
    <div className="bg-[var(--surface-1)] border border-rose-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<ScaleIcon />} title="Bankruptcy Records" count={cases.length} color="text-rose-500" />
      <p className="mb-3 -mt-1 text-xs text-[var(--ink-muted)]">
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
            <p className="text-sm font-medium text-[var(--ink)] truncate">{c.caseName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
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
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<UsersIcon />} title="Officer Network" count={nonEmpty.reduce((s, r) => s + r.carriers.length, 0)} color="text-accent" />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">Other FMCSA-registered carriers listing the same officers.</p>
      <div className="space-y-4">
        {nonEmpty.map((ref) => (
          <div key={ref.officerName}>
            <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">{ref.officerName}</p>
            <div className="space-y-1.5">
              {ref.carriers.map((c) => (
                <div key={c.dotNumber} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">{c.legalName}</p>
                    <p className="text-[11px] text-[var(--ink-muted)] tabular-nums">DOT {c.dotNumber}</p>
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
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
    <div className="bg-[var(--surface-1)] border border-rose-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<ShieldIcon />} title="OFAC Sanctions Screening" count={matches.length} color="text-rose-500" />
      <p className="mb-3 -mt-1 text-xs text-[var(--ink-muted)]">Potential matches against the US Treasury OFAC SDN list. Review carefully.</p>
      <div className="space-y-2">
        {matches.map((m, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--ink)]">{m.matchedName}</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{Math.round(m.score * 100)}% match</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--ink-soft)]">Queried: &quot;{m.queriedName}&quot; &middot; {m.sdnType}</p>
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
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
    <div className="bg-[var(--surface-1)] border border-orange-200 shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<BanIcon />} title="Federal Exclusions (SAM.gov)" count={exclusions.length} color="text-orange-500" />
      <div className="space-y-2">
        {exclusions.map((e, i) => (
          <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5">
            <p className="text-sm font-medium text-[var(--ink)]">{e.name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
              <span>{e.classification}</span><span>&middot;</span><span>{e.exclusionType}</span><span>&middot;</span><span>{e.agency}</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">{e.activeDateRange}</p>
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<FileTextIcon />} title="SEC Filings (EDGAR)" color="text-[var(--ink-muted)]" />
        <p className="text-xs text-[var(--ink-muted)]">No SEC filings found for this entity or its officers.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<FileTextIcon />} title="SEC Filings (EDGAR)" count={filings.length} color="text-blue-500" />
      <div className="space-y-2">
        {filings.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{f.formType}</span>
              <span className="text-sm font-medium text-[var(--ink)] truncate">{f.companyName}</span>
            </div>
            {f.dateFiled && <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">Filed {f.dateFiled}</p>}
            {f.description && f.description !== f.formType && <p className="mt-0.5 text-xs text-[var(--ink-soft)] truncate">{f.description}</p>}
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
      <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
        <SectionHeader icon={<GavelIcon />} title="Federal Court Records" color="text-[var(--ink-muted)]" />
        <p className="text-xs text-[var(--ink-muted)]">No federal court records found.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<GavelIcon />} title="Federal Court Records" count={cases.length} color="text-purple-500" />
      <div className="space-y-2">
        {cases.map((c, i) => (
          <a key={i} href={c.url || undefined} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 hover:bg-purple-50 hover:border-purple-200 transition-colors">
            <p className="text-sm font-medium text-[var(--ink)] truncate">{c.caseName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[var(--ink-soft)]">
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
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<BuildingIcon />} title="Corporate Affiliations" count={affiliations.reduce((s, a) => s + a.companies.length, 0)} color="text-teal-500" />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">Other companies where these officers hold roles (via OpenCorporates).</p>
      <div className="space-y-4">
        {affiliations.map((aff) => (
          <div key={aff.officerName}>
            <p className="text-xs font-semibold text-[var(--ink-soft)] mb-2">{aff.officerName}</p>
            <div className="space-y-1.5">
              {aff.companies.map((co, i) => (
                <a key={i} href={co.opencorporatesUrl || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 hover:bg-teal-50 hover:border-teal-200 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">{co.companyName}</p>
                    <p className="text-[11px] text-[var(--ink-muted)]">{co.jurisdiction.toUpperCase()} &middot; #{co.companyNumber}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${co.status.toLowerCase().includes("active") ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-border"}`}>
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
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader icon={<MailboxIcon />} title="Mailing Address Matches" count={matches.length} color="text-amber-500" />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">Other carriers using the same mailing address.</p>
      <div className="space-y-1.5">
        {matches.map((m) => (
          <div key={m.dotNumber} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--ink)] truncate">{m.legalName}</p>
              <p className="text-[11px] text-[var(--ink-muted)] tabular-nums">DOT {m.dotNumber}</p>
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

/* ── Officer Profiles Card ────────────────────────────────────────────── */

function OfficerRoleRow({ role }: { role: OcOfficerRole }) {
  const dateRange =
    role.startDate || role.endDate
      ? `${role.startDate ?? "?"} – ${role.endDate ?? "present"}`
      : null;

  return (
    <a
      href={role.opencorporatesUrl || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 hover:bg-teal-50 hover:border-teal-200 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--ink)] truncate">{role.companyName}</p>
        <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--ink-muted)]">
          <span>{role.jurisdiction.toUpperCase()}</span>
          {role.companyNumber && <><span>·</span><span>#{role.companyNumber}</span></>}
          {dateRange && <><span>·</span><span>{dateRange}</span></>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {role.position && (
          <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-200 capitalize">
            {role.position}
          </span>
        )}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          role.status.toLowerCase().includes("active")
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
            : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-1 ring-border"
        }`}>
          {role.status}
        </span>
      </div>
    </a>
  );
}

function OfficerCard({ profile }: { profile: OfficerProfile }) {
  const hasOfac = profile.ofacMatches.length > 0;
  const hasSam = profile.samExclusions.length > 0;
  const hasCritical = hasOfac || hasSam;
  const totalFindings =
    profile.carrierRefs.length +
    profile.corporateRoles.length +
    profile.ofacMatches.length +
    profile.samExclusions.length +
    profile.courtCases.length +
    profile.bankruptcyCases.length;

  return (
    <div className={`rounded-2xl border shadow-sm p-5 ${hasCritical ? "border-rose-200 bg-rose-50/30" : "border-[var(--border)] bg-[var(--surface-1)]"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">{profile.name}</p>
            {totalFindings > 0 && (
              <p className="text-[11px] text-[var(--ink-muted)]">{totalFindings} finding{totalFindings !== 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {hasOfac ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-300">
              OFAC Hit
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              OFAC Clear
            </span>
          )}
          {hasSam ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-300">
              SAM Excluded
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
              SAM Clear
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* OFAC matches */}
        {profile.ofacMatches.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 mb-1.5">
              OFAC SDN Matches
            </p>
            <div className="space-y-1.5">
              {profile.ofacMatches.map((m, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2">
                  <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium text-[var(--ink)]">{m.matchedName}</span>
                  <span className="ml-auto rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    {Math.round(m.score * 100)}% match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SAM exclusions */}
        {profile.samExclusions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 mb-1.5">
              Federal Exclusions (SAM.gov)
            </p>
            <div className="space-y-1.5">
              {profile.samExclusions.map((e, i) => (
                <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2">
                  <p className="text-xs font-medium text-[var(--ink)]">{e.name}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-soft)]">{e.classification} · {e.agency}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other carrier registrations */}
        {profile.carrierRefs.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-1.5">
              Other Carrier Registrations ({profile.carrierRefs.length})
            </p>
            <div className="space-y-1.5">
              {profile.carrierRefs.map((c) => (
                <div key={c.dotNumber} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--ink)] truncate">{c.legalName}</p>
                    <p className="text-[11px] text-[var(--ink-muted)] tabular-nums">USDOT {c.dotNumber}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.statusCode && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        c.statusCode === "A"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                      }`}>
                        {c.statusCode === "A" ? "Active" : "Inactive"}
                      </span>
                    )}
                    <a
                      href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${c.dotNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      SAFER
                    </a>
                    <a
                      href={`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?pv_usdot=${c.dotNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      L&amp;I
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corporate roles */}
        {profile.corporateRoles.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 mb-1.5">
              Corporate Roles ({profile.corporateRoles.length})
            </p>
            <div className="space-y-1.5">
              {profile.corporateRoles.map((role, i) => (
                <OfficerRoleRow key={i} role={role} />
              ))}
            </div>
          </div>
        )}

        {/* Court cases */}
        {profile.courtCases.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 mb-1.5">
              Federal Court Records ({profile.courtCases.length})
            </p>
            <div className="space-y-1.5">
              {profile.courtCases.map((c, i) => (
                <a key={i} href={c.url || undefined} target="_blank" rel="noopener noreferrer"
                  className="block rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 hover:bg-purple-50 hover:border-purple-200 transition-colors">
                  <p className="text-xs font-medium text-[var(--ink)] truncate">{c.caseName}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--ink-muted)]">
                    <span>{c.court}</span>
                    {c.dateFiled && <><span>·</span><span>{c.dateFiled}</span></>}
                    {c.status && c.status !== "unknown" && <><span>·</span><span>{c.status}</span></>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bankruptcy */}
        {profile.bankruptcyCases.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 mb-1.5">
              Bankruptcy Filings ({profile.bankruptcyCases.length})
            </p>
            <div className="space-y-1.5">
              {profile.bankruptcyCases.map((c, i) => (
                <a key={i} href={c.url || undefined} target="_blank" rel="noopener noreferrer"
                  className="block rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 hover:bg-rose-100 transition-colors">
                  <p className="text-xs font-medium text-[var(--ink)] truncate">{c.caseName}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11px] text-[var(--ink-muted)]">
                    <span>{c.court}</span>
                    {c.chapter !== "unknown" && <><span>·</span><span className="font-semibold text-rose-600">{c.chapter}</span></>}
                    {c.dateFiled && <><span>·</span><span>{c.dateFiled}</span></>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function OfficerProfilesCard({ profiles }: { profiles: OfficerProfile[] }) {
  if (profiles.length === 0) return null;

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<UsersIcon />}
        title="Officer Profiles"
        count={profiles.length}
        color="text-accent"
      />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">
        Public government records for each registered officer — FMCSA carrier history, corporate roles, sanctions screening, and court records.
      </p>
      <div className="space-y-4">
        {profiles.map((profile) => (
          <OfficerCard key={profile.name} profile={profile} />
        ))}
      </div>
    </div>
  );
}

/* ── Corporate Registry Card ──────────────────────────────────────────── */

function RegistryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 4.5H9.5M4.5 7H9.5M4.5 9.5H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="10.5" cy="10.5" r="2.5" fill="white" stroke="currentColor" strokeWidth="1" />
      <path d="M9.5 10.5h2M10.5 9.5v2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function StateRegistrationRow({ company }: { company: OcCompanyDetail }) {
  const isActive = company.status && !["dissolved", "inactive", "struck off", "cancelled", "revoked", "withdrawn"]
    .some((s) => company.status!.toLowerCase().includes(s));
  const isPrivacy = ["us_wy", "us_nv", "us_nm", "us_sd"].includes(company.jurisdiction);

  return (
    <div className={`rounded-xl border p-4 ${isActive ? "border-[var(--border)] bg-[var(--surface-1)]" : "border-[var(--border)] bg-[var(--surface-2)]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--ink)] truncate">{company.name}</p>
          {company.registeredAddress && (
            <p className="mt-0.5 text-[11px] text-[var(--ink-muted)] truncate">{company.registeredAddress}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
          {/* State badge */}
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
            isPrivacy
              ? "bg-amber-50 text-amber-800 ring-amber-300"
              : "bg-accent-soft text-accent ring-accent/20"
          }`}>
            {company.jurisdictionLabel}
            {isPrivacy && " ⚠"}
          </span>
          {/* Status badge */}
          {company.status && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)] ring-border"
            }`}>
              {company.status}
            </span>
          )}
          {/* Company type */}
          {company.companyType && (
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)] ring-1 ring-border">
              {company.companyType}
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-[var(--ink-muted)]">
        {company.companyNumber && <span>#{company.companyNumber}</span>}
        {company.incorporationDate && (
          <span>Formed {company.incorporationDate}</span>
        )}
        {company.dissolutionDate && (
          <span className="text-rose-500">Dissolved {company.dissolutionDate}</span>
        )}
      </div>

      {/* Officers */}
      {company.officers.length > 0 && (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
            Registered Officers
          </p>
          <div className="space-y-1">
            {company.officers.map((o, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="font-medium text-[var(--ink-soft)]">{o.name}</span>
                {o.position && (
                  <span className="rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 ring-1 ring-teal-200 capitalize">
                    {o.position}
                  </span>
                )}
                {o.endDate && (
                  <span className="text-[var(--ink-muted)]">(former)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OC link */}
      {company.opencorporatesUrl && (
        <div className="mt-3">
          <a
            href={company.opencorporatesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            View on OpenCorporates
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50">
              <path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          {company.registryUrl && (
            <>
              <span className="mx-2 text-ink-muted">·</span>
              <a
                href={company.registryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:underline"
              >
                State Registry
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="opacity-50">
                  <path d="M1 7L7 1M7 1H2M7 1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CorporateRegistryCard({ network }: { network: CorporateNetwork }) {
  if (network.companyRegistrations.length === 0 && network.riskSignals.length === 0) return null;

  const hasHighSignal = network.riskSignals.some((s) => s.severity === "high");
  const hasMediumSignal = network.riskSignals.some((s) => s.severity === "medium");

  return (
    <div className={`bg-[var(--surface-1)] border shadow-sm rounded-2xl p-5 ${
      hasHighSignal ? "border-rose-200" : hasMediumSignal ? "border-amber-200" : "border-[var(--border)]"
    }`}>
      <SectionHeader
        icon={<RegistryIcon />}
        title="State Business Registry"
        count={network.companyRegistrations.length}
        color={hasHighSignal ? "text-rose-500" : hasMediumSignal ? "text-amber-500" : "text-accent"}
      />
      <p className="mb-4 -mt-1 text-xs text-[var(--ink-muted)]">
        Business registrations found across all 50 US state SOS databases via OpenCorporates.
      </p>

      {/* Risk signals */}
      {network.riskSignals.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {network.riskSignals.map((sig, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 ${
                sig.severity === "high"
                  ? "border-rose-200 bg-rose-50"
                  : sig.severity === "medium"
                  ? "border-amber-200 bg-amber-50"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                sig.severity === "high" ? "bg-rose-500" : sig.severity === "medium" ? "bg-amber-500" : "bg-surface-3"
              }`} />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${
                  sig.severity === "high" ? "text-rose-800" : sig.severity === "medium" ? "text-amber-800" : "text-[var(--ink-soft)]"
                }`}>
                  {sig.label}
                </p>
                <p className="text-[11px] text-[var(--ink-soft)]">{sig.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration cards */}
      {network.companyRegistrations.length > 0 ? (
        <div className="space-y-3">
          {network.companyRegistrations.map((co, i) => (
            <StateRegistrationRow key={`${co.jurisdiction}-${co.companyNumber}-${i}`} company={co} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-muted)]">No matching registrations found in state business databases.</p>
      )}
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
    return <p className="py-12 text-center text-base text-[var(--ink-muted)] tracking-wide">Background checks will load when this tab is selected.</p>;
  }

  const officerProfiles = data.officerProfiles ?? [];
  const totalOfficerFindings = officerProfiles.reduce(
    (s, p) =>
      s +
      p.carrierRefs.length +
      p.corporateRoles.length +
      p.ofacMatches.length +
      p.samExclusions.length +
      p.courtCases.length +
      p.bankruptcyCases.length,
    0
  );

  const isEmpty =
    totalOfficerFindings === 0 &&
    data.mailingAddressMatches.length === 0 &&
    data.ofacMatches.length === 0 &&
    data.samExclusions.length === 0 &&
    data.edgarFilings.length === 0 &&
    data.courtCases.length === 0 &&
    data.oshaViolations.length === 0 &&
    data.epaEnforcements.length === 0 &&
    data.bankruptcyCases.length === 0 &&
    (!data.corporateNetwork || (
      data.corporateNetwork.companyRegistrations.length === 0 &&
      data.corporateNetwork.riskSignals.length === 0
    )) &&
    (!data.addressIntelligence || data.addressIntelligence.flags.length === 0) &&
    !data.digitalFootprint;

  if (isEmpty && data.errors.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 text-emerald-600 flex justify-center"><ShieldCheckIcon /></div>
          <p className="text-sm font-medium text-emerald-600">No background findings</p>
          <p className="mt-1.5 text-xs text-[var(--ink-muted)] max-w-xs mx-auto">
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
        <div className="bg-[var(--surface-1)] border border-[var(--border)] shadow-sm rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-600/20">AI Analysis</span>
            <span className="text-[10px] text-[var(--ink-muted)]">Generated by Claude</span>
          </div>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{data.riskNarrative}</p>
        </div>
      ) : data.aiGated?.skipped ? (
        <AiUpgradePrompt reason={data.aiGated.reason} />
      ) : null}

      {/* Digital Footprint & Address Intel side by side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.digitalFootprint && <DigitalFootprintCard footprint={data.digitalFootprint} />}
        {data.addressIntelligence && <AddressIntelligenceCard intel={data.addressIntelligence} />}
      </div>

      {/* Officers — consolidated profiles */}
      <OfficerProfilesCard profiles={data.officerProfiles ?? []} />

      {/* State Business Registry — all-50-state company search */}
      {data.corporateNetwork && <CorporateRegistryCard network={data.corporateNetwork} />}

      {/* Sanctions & Exclusions (company-level) */}
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
      <MailingAddressMatchesCard matches={data.mailingAddressMatches} />
    </div>
  );
}
