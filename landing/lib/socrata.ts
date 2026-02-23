const BASE_URL = "https://data.transportation.gov/resource";

const CENSUS_RESOURCE = "az4n-8mr2";
const INSPECTION_RESOURCE = "fx4q-ay7w";
const CRASH_RESOURCE = "aayw-vxb3";
const INSURANCE_RESOURCE = "qh9u-swkp";
const VIOLATION_RESOURCE = "876r-jsdb";
const AUTH_HIST_RESOURCE = "9mw4-x3tu";
const COMPLAINT_RESOURCE = "r6z9-e9sk";
const FLEET_UNIT_RESOURCE = "wt8s-2hbx";

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

/* ── New Socrata Types ────────────────────────────────────────── */

export type SocrataInsurance = {
  dot_number: string;
  ins_type?: string;
  status?: string;
  coverage_value?: string;
  coverage_type?: string;
  insurer_name?: string;
  policy_effective_date?: string;
  policy_cancellation_date?: string;
  form_type?: string;
};

export type SocrataViolation = {
  dot_number: string;
  insp_date?: string;
  basic_code_desc?: string;
  group_desc?: string;
  violation_code?: string;
  violation_desc?: string;
  oos_indicator?: string;
  unit_type?: string;
  severity_weight?: string;
};

export type SocrataAuthorityHistory = {
  dot_number: string;
  auth_type_desc?: string;
  auth_action_desc?: string;
  action_date?: string;
  docket_number?: string;
  auth_status?: string;
};

export type SocrataComplaint = {
  dot_number: string;
  complaint_date?: string;
  complaint_category?: string;
  status?: string;
  complaint_text?: string;
};

export type SocrataFleetUnit = {
  dot_number: string;
  vin?: string;
  unit_type?: string;
  unit_make?: string;
  unit_year?: string;
  unit_type_desc?: string;
};

/* ── New Socrata Fetch Functions ──────────────────────────────── */

export async function getInsuranceByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataInsurance[]> {
  return socrataFetch<SocrataInsurance>(INSURANCE_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "policy_effective_date DESC",
    $limit: String(limit),
  });
}

export async function getViolationsByDot(
  dotNumber: number,
  limit = 200
): Promise<SocrataViolation[]> {
  return socrataFetch<SocrataViolation>(VIOLATION_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "insp_date DESC",
    $limit: String(limit),
  });
}

export async function getAuthorityHistoryByDot(
  dotNumber: number,
  limit = 50
): Promise<SocrataAuthorityHistory[]> {
  return socrataFetch<SocrataAuthorityHistory>(AUTH_HIST_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "action_date DESC",
    $limit: String(limit),
  });
}

export async function getComplaintsByDot(
  dotNumber: number,
  limit = 100
): Promise<SocrataComplaint[]> {
  return socrataFetch<SocrataComplaint>(COMPLAINT_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $order: "complaint_date DESC",
    $limit: String(limit),
  });
}

export async function getFleetUnitsByDot(
  dotNumber: number,
  limit = 200
): Promise<SocrataFleetUnit[]> {
  return socrataFetch<SocrataFleetUnit>(FLEET_UNIT_RESOURCE, {
    $where: `dot_number='${dotNumber}'`,
    $limit: String(limit),
  });
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
