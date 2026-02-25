import type { SosResult, OcOfficerCompany } from "@/components/carrier/types";

const SUFFIXES = /\b(inc|incorporated|llc|l\.l\.c|corp|corporation|co|company|ltd|limited|lp|llp)\b\.?/gi;

function normalizeCompanyName(name: string): string {
  return name
    .replace(SUFFIXES, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) return fallback;

    const data = await res.json();
    const companies = data?.results?.companies;
    if (!Array.isArray(companies) || companies.length === 0) return fallback;

    // Find best match
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
    const res = await fetch(url, { next: { revalidate: 86400 } });
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
        opencorporatesUrl: o.company.opencorporates_url ?? "",
      });
    }
    return result;
  } catch {
    return result;
  }
}
