import type {
  SosResult,
  OcOfficerCompany,
  OcCompanyDetail,
  OcCompanyOfficer,
  CorporateNetwork,
  CorporateNetworkSignal,
} from "@/components/carrier/types";

const SUFFIXES = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|lp|llp)\b\.?/gi;

function normalizeCompanyName(name: string): string {
  return name
    .replace(SUFFIXES, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Add API key auth header if OPENCORPORATES_API_KEY is set */
function getOcHeaders(): HeadersInit {
  const key = process.env.OPENCORPORATES_API_KEY;
  return key ? { Authorization: `Token token=${key}` } : {};
}

/* ── Jurisdiction Maps ─────────────────────────────────────────── */

const STATE_TO_JURISDICTION: Record<string, string> = {
  AL: "us_al", AK: "us_ak", AZ: "us_az", AR: "us_ar", CA: "us_ca",
  CO: "us_co", CT: "us_ct", DE: "us_de", FL: "us_fl", GA: "us_ga",
  HI: "us_hi", ID: "us_id", IL: "us_il", IN: "us_in", IA: "us_ia",
  KS: "us_ks", KY: "us_ky", LA: "us_la", ME: "us_me", MD: "us_md",
  MA: "us_ma", MI: "us_mi", MN: "us_mn", MS: "us_ms", MO: "us_mo",
  MT: "us_mt", NE: "us_ne", NV: "us_nv", NH: "us_nh", NJ: "us_nj",
  NM: "us_nm", NY: "us_ny", NC: "us_nc", ND: "us_nd", OH: "us_oh",
  OK: "us_ok", OR: "us_or", PA: "us_pa", RI: "us_ri", SC: "us_sc",
  SD: "us_sd", TN: "us_tn", TX: "us_tx", UT: "us_ut", VT: "us_vt",
  VA: "us_va", WA: "us_wa", WV: "us_wv", WI: "us_wi", WY: "us_wy",
  DC: "us_dc",
};

const JURISDICTION_LABEL: Record<string, string> = {
  us_al: "Alabama", us_ak: "Alaska", us_az: "Arizona", us_ar: "Arkansas",
  us_ca: "California", us_co: "Colorado", us_ct: "Connecticut", us_de: "Delaware",
  us_fl: "Florida", us_ga: "Georgia", us_hi: "Hawaii", us_id: "Idaho",
  us_il: "Illinois", us_in: "Indiana", us_ia: "Iowa", us_ks: "Kansas",
  us_ky: "Kentucky", us_la: "Louisiana", us_me: "Maine", us_md: "Maryland",
  us_ma: "Massachusetts", us_mi: "Michigan", us_mn: "Minnesota", us_ms: "Mississippi",
  us_mo: "Missouri", us_mt: "Montana", us_ne: "Nebraska", us_nv: "Nevada",
  us_nh: "New Hampshire", us_nj: "New Jersey", us_nm: "New Mexico", us_ny: "New York",
  us_nc: "North Carolina", us_nd: "North Dakota", us_oh: "Ohio", us_ok: "Oklahoma",
  us_or: "Oregon", us_pa: "Pennsylvania", us_ri: "Rhode Island", us_sc: "South Carolina",
  us_sd: "South Dakota", us_tn: "Tennessee", us_tx: "Texas", us_ut: "Utah",
  us_vt: "Vermont", us_va: "Virginia", us_wa: "Washington", us_wv: "West Virginia",
  us_wi: "Wisconsin", us_wy: "Wyoming", us_dc: "Washington DC",
};

/** States known for minimal disclosure / bearer-share / nominee officer rules */
const PRIVACY_STATES = new Set(["us_wy", "us_nv", "us_nm", "us_sd"]);

function jurisdictionLabel(code: string): string {
  return JURISDICTION_LABEL[code] ?? code.replace("us_", "").toUpperCase();
}

/* ── Company Detail Parser ─────────────────────────────────────── */

function parseCompanyDetail(co: Record<string, unknown>): OcCompanyDetail {
  const jurisdiction = String(co.jurisdiction_code ?? "");

  // Officers array: each entry is {officer: {name, position, start_date, end_date}}
  const officers: OcCompanyOfficer[] = [];
  if (Array.isArray(co.officers)) {
    for (const entry of co.officers) {
      const o = (entry as Record<string, unknown>).officer as Record<string, unknown> | undefined;
      if (!o?.name) continue;
      officers.push({
        name: String(o.name),
        position: o.position ? String(o.position) : null,
        startDate: o.start_date ? String(o.start_date) : null,
        endDate: o.end_date ? String(o.end_date) : null,
      });
    }
  }

  // Registered address: prefer full string, fallback to object fields
  let registeredAddress: string | null = null;
  if (co.registered_address_in_full && typeof co.registered_address_in_full === "string") {
    registeredAddress = co.registered_address_in_full;
  } else if (co.registered_address && typeof co.registered_address === "object") {
    const addr = co.registered_address as Record<string, unknown>;
    const parts = [addr.street_address, addr.locality, addr.region, addr.postal_code]
      .filter(Boolean)
      .map(String);
    if (parts.length > 0) registeredAddress = parts.join(", ");
  }

  return {
    companyNumber: String(co.company_number ?? ""),
    name: String(co.name ?? ""),
    jurisdiction,
    jurisdictionLabel: jurisdictionLabel(jurisdiction),
    status: co.current_status ? String(co.current_status) : null,
    companyType: co.company_type ? String(co.company_type) : null,
    incorporationDate: co.incorporation_date ? String(co.incorporation_date) : null,
    dissolutionDate: co.dissolution_date ? String(co.dissolution_date) : null,
    registeredAddress,
    officers,
    registryUrl: co.registry_url ? String(co.registry_url) : null,
    opencorporatesUrl: co.opencorporates_url ? String(co.opencorporates_url) : null,
  };
}

/* ── Risk Signal Derivation ────────────────────────────────────── */

const DISSOLVED_STATUSES = ["dissolved", "inactive", "struck off", "cancelled", "revoked", "withdrawn"];

function isDissolvedStatus(status: string | null): boolean {
  if (!status) return false;
  const lower = status.toLowerCase();
  return DISSOLVED_STATUSES.some((s) => lower.includes(s));
}

function deriveRiskSignals(
  registrations: OcCompanyDetail[],
  homeState?: string
): CorporateNetworkSignal[] {
  const signals: CorporateNetworkSignal[] = [];

  // Privacy state registrations
  const privacyRegs = registrations.filter((c) => PRIVACY_STATES.has(c.jurisdiction));
  if (privacyRegs.length > 0) {
    const stateNames = [...new Set(privacyRegs.map((c) => c.jurisdictionLabel))].join(", ");
    signals.push({
      severity: "high",
      label: "Privacy State Registration",
      detail: `Registered in ${stateNames} — minimal-disclosure jurisdiction${privacyRegs.length > 1 ? "s" : ""} where officer information may be intentionally hidden.`,
    });
  }

  // Dissolved / inactive registrations
  const dissolved = registrations.filter((c) => isDissolvedStatus(c.status));
  if (dissolved.length > 0) {
    const desc = dissolved
      .map((c) => `${c.jurisdictionLabel}${c.dissolutionDate ? ` (${c.dissolutionDate})` : ""}`)
      .join(", ");
    signals.push({
      severity: "medium",
      label: "Prior Dissolved Entity",
      detail: `Found ${dissolved.length} previously dissolved or inactive registration${dissolved.length > 1 ? "s" : ""}: ${desc}.`,
    });
  }

  // Multiple active registrations (>3 is unusual unless large enterprise)
  const active = registrations.filter((c) => !isDissolvedStatus(c.status));
  if (active.length > 3) {
    const states = [...new Set(active.map((c) => c.jurisdictionLabel))].join(", ");
    signals.push({
      severity: "medium",
      label: "Multiple Active Registrations",
      detail: `Found ${active.length} active registrations across states: ${states}. Verify these are legitimate multi-state operations.`,
    });
  }

  // Recently formed entity (<90 days)
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  for (const reg of registrations) {
    if (!reg.incorporationDate) continue;
    const formed = new Date(reg.incorporationDate).getTime();
    if (!isNaN(formed) && now - formed < ninetyDays) {
      signals.push({
        severity: "low",
        label: "Recently Formed Entity",
        detail: `${reg.jurisdictionLabel} registration incorporated ${reg.incorporationDate} — less than 90 days ago.`,
      });
      break; // only flag once
    }
  }

  // Home state not registered (only meaningful if we found results elsewhere)
  if (homeState && registrations.length > 0) {
    const homeJurisdiction = STATE_TO_JURISDICTION[homeState.toUpperCase()];
    if (homeJurisdiction && !registrations.some((r) => r.jurisdiction === homeJurisdiction)) {
      signals.push({
        severity: "low",
        label: "Home State Not Registered",
        detail: `No registration found in ${JURISDICTION_LABEL[homeJurisdiction] ?? homeState} (carrier's physical state), but registrations exist in other states.`,
      });
    }
  }

  return signals;
}

/* ── Public API Functions ──────────────────────────────────────── */

export async function checkSecretaryOfState(
  companyName: string,
  state: string | undefined
): Promise<SosResult> {
  const fallback: SosResult = {
    found: false,
    matchQuality: "none",
    registrationStatus: null,
    registeredName: null,
    jurisdiction: null,
    opencorporatesUrl: null,
  };

  if (!companyName || !state) return fallback;

  const jurisdiction = STATE_TO_JURISDICTION[state.toUpperCase()];
  if (!jurisdiction) return fallback;

  const normalized = normalizeCompanyName(companyName);
  if (!normalized) return fallback;

  try {
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(normalized)}&jurisdiction_code=${jurisdiction}&per_page=5`;
    const res = await fetch(url, { headers: getOcHeaders(), next: { revalidate: 3600 } });

    if (!res.ok) return fallback;

    const data = await res.json();
    const companies = data?.results?.companies;
    if (!Array.isArray(companies) || companies.length === 0) return fallback;

    for (const entry of companies) {
      const co = entry.company;
      if (!co) continue;

      const registeredNorm = normalizeCompanyName(co.name ?? "");
      const isExact = registeredNorm === normalized;
      const isPartial =
        registeredNorm.includes(normalized) || normalized.includes(registeredNorm);

      if (isExact || isPartial) {
        return {
          found: true,
          matchQuality: isExact ? "exact" : "partial",
          registrationStatus: co.current_status ?? null,
          registeredName: co.name ?? null,
          jurisdiction: co.jurisdiction_code ?? null,
          opencorporatesUrl: co.opencorporates_url ?? null,
        };
      }
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/** Search OpenCorporates for an officer name to find other corporate roles. */
export async function searchOfficers(
  name: string,
  limit = 5
): Promise<OcOfficerCompany> {
  const result: OcOfficerCompany = { officerName: name, companies: [] };
  const trimmed = name.trim();
  if (!trimmed) return result;

  try {
    const url = `https://api.opencorporates.com/v0.4/officers/search?q=${encodeURIComponent(trimmed)}&per_page=${limit}`;
    const res = await fetch(url, { headers: getOcHeaders(), next: { revalidate: 86400 } });
    if (!res.ok) return result;

    const data = await res.json();
    const officers = data?.results?.officers;
    if (!Array.isArray(officers)) return result;

    for (const entry of officers) {
      const o = entry.officer;
      if (!o?.company) continue;
      result.companies.push({
        companyName: o.company.name ?? "Unknown",
        companyNumber: o.company.company_number ?? "",
        jurisdiction: o.company.jurisdiction_code ?? "",
        status: o.company.current_status ?? "unknown",
        position: (o.position as string | undefined) ?? null,
        startDate: (o.start_date as string | undefined) ?? null,
        endDate: (o.end_date as string | undefined) ?? null,
        opencorporatesUrl: o.company.opencorporates_url ?? "",
      });
    }
    return result;
  } catch {
    return result;
  }
}

/**
 * Search for a company name across ALL US state registries.
 * Returns basic company info (officers array empty — use getCompanyDetails to populate).
 */
export async function searchCompanyUS(
  name: string,
  limit = 20
): Promise<OcCompanyDetail[]> {
  const normalized = normalizeCompanyName(name);
  if (!normalized) return [];

  try {
    const url = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(name)}&country_code=us&per_page=${limit}`;
    const res = await fetch(url, { headers: getOcHeaders(), next: { revalidate: 3600 } });
    if (!res.ok) return [];

    const data = await res.json();
    const companies = data?.results?.companies;
    if (!Array.isArray(companies)) return [];

    return companies
      .map((e: Record<string, unknown>) => e.company as Record<string, unknown>)
      .filter((co) => co && String(co.jurisdiction_code ?? "").startsWith("us_"))
      .map(parseCompanyDetail);
  } catch {
    return [];
  }
}

/**
 * Fetch full company details including embedded officers list.
 * Requires jurisdiction code (e.g. "us_il") and company number.
 */
export async function getCompanyDetails(
  jurisdictionCode: string,
  companyNumber: string
): Promise<OcCompanyDetail | null> {
  if (!jurisdictionCode || !companyNumber) return null;

  try {
    const url = `https://api.opencorporates.com/v0.4/companies/${jurisdictionCode}/${encodeURIComponent(companyNumber)}?sparse=false`;
    const res = await fetch(url, { headers: getOcHeaders(), next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const co = data?.results?.company as Record<string, unknown> | undefined;
    if (!co) return null;

    return parseCompanyDetail(co);
  } catch {
    return null;
  }
}

/**
 * Build a corporate network for a carrier:
 * 1. Search company name across all US states
 * 2. Fetch full details (with officers) for top 5 matches
 * 3. Derive risk signals
 */
export async function buildCorporateNetwork(
  companyName: string,
  _officers: string[],
  homeState?: string
): Promise<CorporateNetwork> {
  try {
    const normalized = normalizeCompanyName(companyName);

    // Step 1: search across US
    const searchResults = await searchCompanyUS(companyName, 20);

    // Step 2: filter to relevant matches, take top 5
    const matches = searchResults
      .filter((co) => {
        const coNorm = normalizeCompanyName(co.name);
        return coNorm === normalized || coNorm.includes(normalized) || normalized.includes(coNorm);
      })
      .slice(0, 5);

    // Step 3: fetch full details with officers (parallel)
    const detailResults = await Promise.allSettled(
      matches.map((m) => getCompanyDetails(m.jurisdiction, m.companyNumber))
    );

    const companyRegistrations: OcCompanyDetail[] = [];
    for (let i = 0; i < detailResults.length; i++) {
      const r = detailResults[i];
      if (r.status === "fulfilled" && r.value) {
        companyRegistrations.push(r.value);
      } else {
        // Fall back to search-level data (no officers) if detail fetch failed
        companyRegistrations.push(matches[i]);
      }
    }

    // Sort: active first, then dissolved
    companyRegistrations.sort((a, b) => {
      const aActive = !isDissolvedStatus(a.status);
      const bActive = !isDissolvedStatus(b.status);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return 0;
    });

    // Step 4: derive risk signals
    const riskSignals = deriveRiskSignals(companyRegistrations, homeState);

    return { companyRegistrations, riskSignals };
  } catch {
    return { companyRegistrations: [], riskSignals: [] };
  }
}
