"use client";

import { SkeletonRows } from "../shared";
import type {
  BackgroundData,
  OfficerCrossRef,
  OfacMatch,
  SamExclusion,
  EdgarFiling,
  CourtCase,
  OcOfficerCompany,
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

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  color: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={color}>{icon}</span>
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
        {title}
      </h3>
      {count !== undefined && (
        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${color} bg-gray-100 ring-1 ring-gray-200`}>
          {count}
        </span>
      )}
    </div>
  );
}

/* ── Icons (inline SVG) ───────────────────────────────────────────────── */

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 12C1 9.79 2.79 8 5 8C7.21 8 9 9.79 9 12" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 8C12.16 8.5 13 10 13 12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L2 3.5V6.5C2 10.09 4.12 13.35 7 14C9.88 13.35 12 10.09 12 6.5V3.5L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.1 3.1L10.9 10.9" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5H8.5L11 4V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8.5 1.5V4H11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 7H9M5 9H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function GavelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M4 3L11 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.5 4.5L5.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 11.5L12.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 13H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5H6M8 5H9M5 7.5H6M8 7.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.5 12V10H8.5V12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function MailboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="4" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6L7 9L12.5 6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
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
    { label: "Corp. Affiliations", count: data.corporateAffiliations.reduce((s, o) => s + o.companies.length, 0), color: "text-teal-600" },
    { label: "Address Matches", count: data.mailingAddressMatches.length, color: "text-amber-600" },
  ];
  const totalFindings = categories.reduce((s, c) => s + c.count, 0);
  const hasCritical = data.ofacMatches.length > 0 || data.samExclusions.length > 0;

  return (
    <div className={`bg-white border shadow-sm rounded-2xl px-5 py-4 ${hasCritical ? "border-rose-200" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-extrabold tabular-nums ${hasCritical ? "text-rose-600" : "text-gray-900"}`}>
            {totalFindings}
          </span>
          <span className="text-sm font-medium text-gray-500">
            background finding{totalFindings !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {categories
            .filter((c) => c.count > 0)
            .map((c) => (
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

/* ── Officer Network Card ─────────────────────────────────────────────── */

function OfficerNetworkCard({ crossRefs }: { crossRefs: OfficerCrossRef[] }) {
  const nonEmpty = crossRefs.filter((r) => r.carriers.length > 0);
  if (nonEmpty.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<UsersIcon />}
        title="Officer Network"
        count={nonEmpty.reduce((s, r) => s + r.carriers.length, 0)}
        color="text-indigo-500"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Other FMCSA-registered carriers listing the same officers.
      </p>
      <div className="space-y-4">
        {nonEmpty.map((ref) => (
          <div key={ref.officerName}>
            <p className="text-xs font-semibold text-gray-700 mb-2">{ref.officerName}</p>
            <div className="space-y-1.5">
              {ref.carriers.map((c) => (
                <div
                  key={c.dotNumber}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{c.legalName}</p>
                    <p className="text-[11px] text-gray-400 tabular-nums">DOT {c.dotNumber}</p>
                  </div>
                  {c.statusCode && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        c.statusCode === "A"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                          : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                      }`}
                    >
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
      <SectionHeader
        icon={<ShieldIcon />}
        title="OFAC Sanctions Screening"
        count={matches.length}
        color="text-rose-500"
      />
      <p className="mb-3 -mt-1 text-xs text-gray-400">
        Potential matches against the US Treasury OFAC SDN list. Review carefully.
      </p>
      <div className="space-y-2">
        {matches.map((m, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
            <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{m.matchedName}</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  {Math.round(m.score * 100)}% match
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                Queried: &quot;{m.queriedName}&quot; &middot; {m.sdnType}
              </p>
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
      <SectionHeader
        icon={<BanIcon />}
        title="Federal Exclusions (SAM.gov)"
        count={exclusions.length}
        color="text-orange-500"
      />
      <div className="space-y-2">
        {exclusions.map((e, i) => (
          <div key={i} className="rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5">
            <p className="text-sm font-medium text-gray-900">{e.name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>{e.classification}</span>
              <span>&middot;</span>
              <span>{e.exclusionType}</span>
              <span>&middot;</span>
              <span>{e.agency}</span>
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
      <SectionHeader
        icon={<FileTextIcon />}
        title="SEC Filings (EDGAR)"
        count={filings.length}
        color="text-blue-500"
      />
      <div className="space-y-2">
        {filings.map((f, i) => (
          <a
            key={i}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                {f.formType}
              </span>
              <span className="text-sm font-medium text-gray-900 truncate">{f.companyName}</span>
            </div>
            {f.dateFiled && (
              <p className="mt-0.5 text-[11px] text-gray-400">Filed {f.dateFiled}</p>
            )}
            {f.description && f.description !== f.formType && (
              <p className="mt-0.5 text-xs text-gray-500 truncate">{f.description}</p>
            )}
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
      <SectionHeader
        icon={<GavelIcon />}
        title="Federal Court Records"
        count={cases.length}
        color="text-purple-500"
      />
      <div className="space-y-2">
        {cases.map((c, i) => (
          <a
            key={i}
            href={c.url || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 hover:bg-purple-50 hover:border-purple-200 transition-colors"
          >
            <p className="text-sm font-medium text-gray-900 truncate">{c.caseName}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span>{c.court}</span>
              {c.docketNumber && (
                <>
                  <span>&middot;</span>
                  <span className="tabular-nums">{c.docketNumber}</span>
                </>
              )}
              {c.dateFiled && (
                <>
                  <span>&middot;</span>
                  <span>Filed {c.dateFiled}</span>
                </>
              )}
              {c.status && c.status !== "unknown" && (
                <>
                  <span>&middot;</span>
                  <span>{c.status}</span>
                </>
              )}
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
      <SectionHeader
        icon={<BuildingIcon />}
        title="Corporate Affiliations"
        count={affiliations.reduce((s, a) => s + a.companies.length, 0)}
        color="text-teal-500"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Other companies where these officers hold roles (via OpenCorporates).
      </p>
      <div className="space-y-4">
        {affiliations.map((aff) => (
          <div key={aff.officerName}>
            <p className="text-xs font-semibold text-gray-700 mb-2">{aff.officerName}</p>
            <div className="space-y-1.5">
              {aff.companies.map((co, i) => (
                <a
                  key={i}
                  href={co.opencorporatesUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 hover:bg-teal-50 hover:border-teal-200 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{co.companyName}</p>
                    <p className="text-[11px] text-gray-400">
                      {co.jurisdiction.toUpperCase()} &middot; #{co.companyNumber}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      co.status.toLowerCase().includes("active")
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                        : "bg-gray-100 text-gray-600 ring-1 ring-gray-300"
                    }`}
                  >
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

function MailingAddressMatchesCard({
  matches,
}: {
  matches: { dotNumber: string; legalName: string; statusCode?: string }[];
}) {
  if (matches.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5">
      <SectionHeader
        icon={<MailboxIcon />}
        title="Mailing Address Matches"
        count={matches.length}
        color="text-amber-500"
      />
      <p className="mb-4 -mt-1 text-xs text-gray-400">
        Other carriers using the same mailing address.
      </p>
      <div className="space-y-1.5">
        {matches.map((m) => (
          <div
            key={m.dotNumber}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{m.legalName}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">DOT {m.dotNumber}</p>
            </div>
            {m.statusCode && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  m.statusCode === "A"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                }`}
              >
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
    return (
      <p className="py-12 text-center text-sm text-rose-400">{error}</p>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-base text-gray-400 tracking-wide">
        Background checks will load when this tab is selected.
      </p>
    );
  }

  const isEmpty =
    data.officerCrossRefs.every((r) => r.carriers.length === 0) &&
    data.mailingAddressMatches.length === 0 &&
    data.ofacMatches.length === 0 &&
    data.samExclusions.length === 0 &&
    data.edgarFilings.length === 0 &&
    data.courtCases.length === 0 &&
    data.corporateAffiliations.length === 0;

  if (isEmpty && data.errors.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 text-emerald-600 flex justify-center">
            <ShieldCheckIcon />
          </div>
          <p className="text-sm font-medium text-emerald-600">No background findings</p>
          <p className="mt-1.5 text-xs text-gray-400 max-w-xs mx-auto">
            No officer cross-references, sanctions matches, exclusions, court records, or corporate affiliations were found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <BackgroundSummaryBanner data={data} />
      <OfficerNetworkCard crossRefs={data.officerCrossRefs} />
      <SanctionsScreeningCard matches={data.ofacMatches} />
      <FederalExclusionsCard exclusions={data.samExclusions} />
      <SecFilingsCard filings={data.edgarFilings} />
      <CourtRecordsCard cases={data.courtCases} />
      <CorporateAffiliationsCard affiliations={data.corporateAffiliations} />
      <MailingAddressMatchesCard matches={data.mailingAddressMatches} />
    </div>
  );
}
