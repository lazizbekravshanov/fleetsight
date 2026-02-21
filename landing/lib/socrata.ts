const BASE_URL = "https://data.transportation.gov/resource";

const CENSUS_RESOURCE = "az4n-8mr2";
const INSPECTION_RESOURCE = "fx4q-ay7w";
const CRASH_RESOURCE = "aayw-vxb3";

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
  trmtrail?: string;
  interstate?: string;
  intrastate?: string;
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
};

async function socrataFetch<T>(
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

  const where = isNumeric
    ? `dot_number='${trimmed}'`
    : `upper(legal_name) like upper('%${trimmed.replace(/'/g, "''")}%') OR upper(dba_name) like upper('%${trimmed.replace(/'/g, "''")}%')`;

  return socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: where,
    $limit: String(limit),
    $order: "legal_name ASC",
  });
}

export async function getCarrierByDot(
  dotNumber: number
): Promise<SocrataCarrier | null> {
  const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $limit: "1",
  });
  return results[0] ?? null;
}

export async function getInspectionsByDot(
  dotNumber: number,
  limit = 100
): Promise<SocrataInspection[]> {
  return socrataFetch<SocrataInspection>(INSPECTION_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "insp_date DESC",
    $limit: String(limit),
  });
}

export async function getCrashesByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataCrash[]> {
  return socrataFetch<SocrataCrash>(CRASH_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "report_date DESC",
    $limit: String(limit),
  });
}
