import { cacheGet, cacheSet } from "@/lib/cache";

const BASE_URL = "https://data.transportation.gov/resource";

export const CENSUS_RESOURCE = "az4n-8mr2";
const INSPECTION_RESOURCE = "fx4q-ay7w";
const CRASH_RESOURCE = "aayw-vxb3";
const INSURANCE_RESOURCE = "qh9u-swkp";   // dot_number is 8-char zero-padded
const AUTH_HIST_RESOURCE = "9mw4-x3tu";    // dot_number is 8-char zero-padded
const FLEET_UNIT_RESOURCE = "wt8s-2hbx";   // joined via inspection_id (no dot_number)

/** Zero-pad DOT number to 8 characters for datasets that use that format */
export function padDot(dotNumber: number): string {
  return String(dotNumber).padStart(8, "0");
}

export type SocrataCarrier = {
  dot_number: string;
  legal_name: string;
  dba_name?: string;
  status_code?: string;
  phy_street?: string;
  phy_city?: string;
  phy_state?: string;
  phy_zip?: string;
  phone?: string;
  email_address?: string;
  prior_revoke_flag?: string;
  prior_revoke_dot?: string;
  add_date?: string;
  power_units?: string;
  truck_units?: string;
  bus_units?: string;
  total_drivers?: string;
  total_cdl?: string;
  company_officer_1?: string;
  company_officer_2?: string;
  carrier_operation?: string;
  carship?: string;
  hm_ind?: string;
  fleetsize?: string;
  classdef?: string;
  docket1prefix?: string;
  docket1?: string;
  docket1_status_code?: string;
  owntract?: string;
  owntrail?: string;
  owntruck?: string;
  trmtrail?: string;
  interstate?: string;
  intrastate?: string;
  business_org_desc?: string;
  business_org_id?: string;
  mcs150_date?: string;
  mcs150_mileage?: string;
  mcs150_mileage_year?: string;
  cell_phone?: string;
  fax?: string;
  carrier_mailing_street?: string;
  carrier_mailing_city?: string;
  carrier_mailing_state?: string;
  carrier_mailing_zip?: string;
  dun_bradstreet_no?: string;
  safety_inv_terr?: string;
};

export type SocrataInspection = {
  inspection_id?: string;
  dot_number: string;
  report_state?: string;
  insp_date?: string;
  insp_level_id?: string;
  viol_total?: string;
  oos_total?: string;
  driver_viol_total?: string;
  driver_oos_total?: string;
  vehicle_viol_total?: string;
  vehicle_oos_total?: string;
  hazmat_viol_total?: string;
  hazmat_oos_total?: string;
  location_desc?: string;
  report_number?: string;
  insp_facility?: string;
  insp_start_time?: string;
  insp_end_time?: string;
  post_acc_ind?: string;
  gross_comb_veh_wt?: string;
  insp_carrier_name?: string;
  insp_carrier_city?: string;
  insp_carrier_state?: string;
};

export type SocrataCrash = {
  crash_id?: string;
  dot_number: string;
  report_date?: string;
  report_state?: string;
  city?: string;
  location?: string;
  fatalities?: string;
  injuries?: string;
  tow_away?: string;
  report_number?: string;
  report_time?: string;
  cargo_body_type_id?: string;
  vehicle_configuration_id?: string;
  federal_recordable?: string;
  state_recordable?: string;
  truck_bus_ind?: string;
};

export async function socrataFetch<T>(
  resourceId: string,
  params: Record<string, string>
): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${resourceId}.json`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (process.env.SOCRATA_APP_TOKEN) {
    headers["X-App-Token"] = process.env.SOCRATA_APP_TOKEN;
  }

  const res = await fetch(url.toString(), { headers, next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`Socrata API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function searchCarriers(
  query: string,
  limit = 20
): Promise<SocrataCarrier[]> {
  const trimmed = query.trim();
  const isNumeric = /^\d+$/.test(trimmed);

  // MC/docket number pattern: MC-123456, MC 123456, MC123456
  const mcMatch = trimmed.match(/^MC[-\s]?(\d{1,8})$/i);

  let where: string;
  if (mcMatch) {
    // Explicit MC prefix — search docket number only, with or without leading zeros
    const mcNum = mcMatch[1];
    where = `docket1='${mcNum}' OR docket1='${mcNum.padStart(6, "0")}'`;
  } else if (isNumeric) {
    // Ambiguous number — could be USDOT or MC#, search both
    where = `dot_number='${trimmed}' OR docket1='${trimmed}' OR docket1='${trimmed.padStart(6, "0")}'`;
  } else {
    where = `upper(legal_name) like upper('%${trimmed.replace(/'/g, "''")}%') OR upper(dba_name) like upper('%${trimmed.replace(/'/g, "''")}%')`;
  }

  return socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: where,
    $limit: String(limit),
    $order: "legal_name ASC",
  });
}

export async function getCarrierByDot(
  dotNumber: number
): Promise<SocrataCarrier | null> {
  const cacheKey = `socrata:carrier:${dotNumber}`;
  const cached = await cacheGet<SocrataCarrier | null>(cacheKey);
  if (cached !== null) return cached;

  const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $limit: "1",
  });
  const carrier = results[0] ?? null;
  if (carrier) await cacheSet(cacheKey, carrier, 3600); // 1 hour
  return carrier;
}

export async function getInspectionsByDot(
  dotNumber: number,
  limit = 100
): Promise<SocrataInspection[]> {
  const cacheKey = `socrata:insp:${dotNumber}:${limit}`;
  const cached = await cacheGet<SocrataInspection[]>(cacheKey);
  if (cached !== null) return cached;

  const results = await socrataFetch<SocrataInspection>(INSPECTION_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "insp_date DESC",
    $limit: String(limit),
  });
  await cacheSet(cacheKey, results, 3600); // 1 hour
  return results;
}

export async function getCrashesByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataCrash[]> {
  const cacheKey = `socrata:crash:${dotNumber}:${limit}`;
  const cached = await cacheGet<SocrataCrash[]>(cacheKey);
  if (cached !== null) return cached;

  const results = await socrataFetch<SocrataCrash>(CRASH_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "report_date DESC",
    $limit: String(limit),
  });
  await cacheSet(cacheKey, results, 3600); // 1 hour
  return results;
}

/* ── New Socrata Types ────────────────────────────────────────── */

export type SocrataInsurance = {
  dot_number: string;
  docket_number?: string;
  ins_form_code?: string;
  mod_col_1?: string;         // type: "SURETY", "BIPD LIABILITY", etc.
  name_company?: string;      // insurer name
  policy_no?: string;
  trans_date?: string;
  underl_lim_amount?: string;
  max_cov_amount?: string;
  effective_date?: string;
};

export type SocrataAuthorityHistory = {
  dot_number: string;
  docket_number?: string;
  sub_number?: string;
  mod_col_1?: string;              // auth type: "MOTOR PROPERTY COMMON CARRIER" etc.
  original_action_desc?: string;   // "GRANTED"
  orig_served_date?: string;
  disp_action_desc?: string;       // "REVOKED", "SUSPENDED" etc.
  disp_decided_date?: string;
  disp_served_date?: string;
};

export type SocrataFleetUnit = {
  inspection_id: string;
  insp_unit_id?: string;
  insp_unit_type_id?: string;
  insp_unit_number?: string;
  insp_unit_make?: string;
  insp_unit_company?: string;
  insp_unit_license?: string;
  insp_unit_license_state?: string;
  insp_unit_vehicle_id_number?: string;  // VIN
  insp_unit_decal?: string;
};

/* ── New Socrata Fetch Functions ──────────────────────────────── */

export async function getInsuranceByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataInsurance[]> {
  const cacheKey = `socrata:ins:${dotNumber}:${limit}`;
  const cached = await cacheGet<SocrataInsurance[]>(cacheKey);
  if (cached !== null) return cached;

  const results = await socrataFetch<SocrataInsurance>(INSURANCE_RESOURCE, {
    $where: `dot_number='${padDot(dotNumber)}'`,
    $limit: String(limit),
  });
  await cacheSet(cacheKey, results, 3600); // 1 hour
  return results;
}

export async function getAuthorityHistoryByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataAuthorityHistory[]> {
  return socrataFetch<SocrataAuthorityHistory>(AUTH_HIST_RESOURCE, {
    $where: `dot_number='${padDot(dotNumber)}'`,
    $limit: String(limit),
  });
}

/**
 * Get fleet units by inspection IDs (joined from inspections dataset).
 * The fleet units dataset has no dot_number — we look up by inspection_id.
 */
export async function getFleetUnitsByInspectionIds(
  inspectionIds: string[],
  limit = 200
): Promise<SocrataFleetUnit[]> {
  if (inspectionIds.length === 0) return [];

  // Batch into groups of 20 inspection_ids to keep URL reasonable
  const batchSize = 20;
  const results: SocrataFleetUnit[] = [];
  for (let i = 0; i < inspectionIds.length && results.length < limit; i += batchSize) {
    const batch = inspectionIds.slice(i, i + batchSize);
    const inClause = batch.map((id) => `'${id}'`).join(",");
    const batchResults = await socrataFetch<SocrataFleetUnit>(FLEET_UNIT_RESOURCE, {
      $where: `inspection_id in(${inClause})`,
      $limit: String(limit - results.length),
    });
    results.push(...batchResults);
  }
  return results;
}

export async function getPeerBenchmark(
  fleetsize: string | undefined
): Promise<{ avgPowerUnits: number; avgDrivers: number; avgOosRate: number; carrierCount: number }> {
  if (!fleetsize) {
    return { avgPowerUnits: 0, avgDrivers: 0, avgOosRate: 0, carrierCount: 0 };
  }

  const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `fleetsize='${fleetsize}' AND status_code='A'`,
    $select: "avg(power_units) as avg_pu, avg(total_drivers) as avg_dr, count(*) as cnt",
    $limit: "1",
  });

  // The aggregate response comes back as a single row with string values
  const row = results[0] as Record<string, string> | undefined;
  if (!row) {
    return { avgPowerUnits: 0, avgDrivers: 0, avgOosRate: 0, carrierCount: 0 };
  }

  return {
    avgPowerUnits: parseFloat(row.avg_pu ?? "0") || 0,
    avgDrivers: parseFloat(row.avg_dr ?? "0") || 0,
    avgOosRate: 0, // computed client-side from inspections
    carrierCount: parseInt(row.cnt ?? "0", 10) || 0,
  };
}

/* ── Cross-matching queries ─────────────────────────────────────── */

export async function getInsuranceByPolicy(
  policyNo: string,
  limit = 20
): Promise<SocrataInsurance[]> {
  return socrataFetch<SocrataInsurance>(INSURANCE_RESOURCE, {
    $where: `policy_no='${policyNo.replace(/'/g, "''")}'`,
    $limit: String(limit),
  });
}

export async function searchCarriersByOfficer(
  name: string,
  limit = 20
): Promise<SocrataCarrier[]> {
  const normalized = name.trim().replace(/'/g, "''").toUpperCase();
  if (!normalized) return [];
  return socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `upper(company_officer_1)='${normalized}' OR upper(company_officer_2)='${normalized}'`,
    $limit: String(limit),
    $order: "add_date DESC",
  });
}

export async function searchCarriersByMailingAddress(
  street: string,
  city: string,
  state: string,
  limit = 10
): Promise<SocrataCarrier[]> {
  const normStreet = street.trim().replace(/'/g, "''").toUpperCase();
  const normCity = city.trim().replace(/'/g, "''").toUpperCase();
  const normState = state.trim().toUpperCase();
  if (!normStreet || !normCity || !normState) return [];
  return socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `upper(carrier_mailing_street)='${normStreet}' AND upper(carrier_mailing_city)='${normCity}' AND upper(carrier_mailing_state)='${normState}'`,
    $limit: String(limit),
    $order: "add_date DESC",
  });
}

export async function searchCarriersByAddress(
  street: string,
  city: string,
  state: string,
  limit = 10
): Promise<SocrataCarrier[]> {
  const normStreet = street.trim().replace(/'/g, "''").toUpperCase();
  const normCity = city.trim().replace(/'/g, "''").toUpperCase();
  const normState = state.trim().toUpperCase();
  return socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `upper(phy_street)='${normStreet}' AND upper(phy_city)='${normCity}' AND upper(phy_state)='${normState}'`,
    $limit: String(limit),
    $order: "add_date DESC",
  });
}
