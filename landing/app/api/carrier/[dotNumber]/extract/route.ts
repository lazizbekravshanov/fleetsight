import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getInsuranceByDot,
  getAuthorityHistoryByDot,
} from "@/lib/socrata";
import { getCarrierBasics, getCarrierAuthority, getCarrierOos } from "@/lib/fmcsa";
import { decodeStatus } from "@/lib/fmcsa-codes";
import { computeAllSignals } from "@/lib/detection-signals";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

// ── FMCSA response helpers (inline to avoid client import issues) ──

function extractArray(obj: unknown, ...keys: string[]): unknown[] {
  if (!obj || typeof obj !== "object") return [];
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== "object") return [];
    cur = (cur as Record<string, unknown>)[key];
  }
  return Array.isArray(cur) ? cur : cur ? [cur] : [];
}

function str(val: unknown): string | null {
  if (val == null) return null;
  return String(val);
}

function num(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ── Parse FMCSA BASIC scores ──

function parseBasics(
  basicsPayload: unknown
): { basic: string; percentile: number; alert: boolean }[] {
  const items = extractArray(basicsPayload, "content", "basics");
  return items.map((item) => {
    const rec = item as Record<string, unknown>;
    return {
      basic: str(rec.basicsDescription ?? rec.basicsName) ?? "Unknown",
      percentile: num(rec.basicsPercentile) ?? 0,
      alert: rec.basicsAlert === "Yes" || rec.basicsAlert === true,
    };
  });
}

// ── Parse FMCSA authority status ──

function parseAuthority(
  authorityPayload: unknown
): { common: string; contract: string; broker: string } {
  const result = { common: "None", contract: "None", broker: "None" };
  const items = extractArray(authorityPayload, "content", "authority");
  for (const item of items) {
    const rec = item as Record<string, unknown>;
    const type = str(rec.authorityType)?.toUpperCase() ?? "";
    const status = str(rec.authorityStatus) ?? "None";
    if (type.includes("COMMON")) result.common = status;
    else if (type.includes("CONTRACT")) result.contract = status;
    else if (type.includes("BROKER")) result.broker = status;
  }
  return result;
}

// ── Parse FMCSA OOS data ──

function parseOos(
  oosPayload: unknown
): { total: number; oosTotal: number; oosRate: number } {
  const items = extractArray(oosPayload, "content", "oos");
  let inspTotal = 0;
  let oosTotal = 0;
  for (const item of items) {
    const rec = item as Record<string, unknown>;
    inspTotal += num(rec.inspectionsTotal) ?? 0;
    oosTotal += num(rec.oosTotal) ?? 0;
  }
  return {
    total: inspTotal,
    oosTotal,
    oosRate: inspTotal > 0 ? Math.round((oosTotal / inspTotal) * 10000) / 10000 : 0,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);
  const dotStr = String(dotNumber);

  // Fetch all data sources in parallel — each non-fatal
  const [carrier, inspections, crashes, insurance, authorityHistory] =
    await Promise.all([
      getCarrierByDot(dotNumber),
      getInspectionsByDot(dotNumber, 100).catch(() => []),
      getCrashesByDot(dotNumber, 50).catch(() => []),
      getInsuranceByDot(dotNumber).catch(() => []),
      getAuthorityHistoryByDot(dotNumber).catch(() => []),
    ]);

  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  // FMCSA API data — non-fatal
  let basics: unknown = null;
  let authority: unknown = null;
  let oos: unknown = null;
  try {
    [basics, authority, oos] = await Promise.all([
      getCarrierBasics(dotStr).catch(() => null),
      getCarrierAuthority(dotStr).catch(() => null),
      getCarrierOos(dotStr).catch(() => null),
    ]);
  } catch {
    // FMCSA_WEBKEY may not be configured
  }

  // Fetch prior carrier for reincarnation check
  let priorCarrier = null;
  if (carrier.prior_revoke_dot) {
    const priorDot = parseInt(carrier.prior_revoke_dot, 10);
    if (priorDot > 0) {
      priorCarrier = await getCarrierByDot(priorDot).catch(() => null);
    }
  }

  // Run detection signals
  const { anomalyFlags, authorityMill, brokerReincarnation } = computeAllSignals({
    carrier,
    insurance,
    authorityHistory,
    priorCarrier,
  });

  // Parse FMCSA structured data
  const safetyScores = parseBasics(basics);
  const operatingAuthority = parseAuthority(authority);
  const oosStats = parseOos(oos);

  // Compute crash stats from Socrata data
  const crashes24mo = { total: 0, fatal: 0, injury: 0 };
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  for (const c of crashes) {
    if (c.report_date && new Date(c.report_date) >= twoYearsAgo) {
      crashes24mo.total++;
      crashes24mo.fatal += parseInt(c.fatalities ?? "0", 10) || 0;
      crashes24mo.injury += parseInt(c.injuries ?? "0", 10) || 0;
    }
  }

  // Compute inspection stats from Socrata data (24 months)
  let inspTotal = 0;
  let inspOos = 0;
  for (const insp of inspections) {
    if (insp.insp_date && new Date(insp.insp_date) >= twoYearsAgo) {
      inspTotal++;
      inspOos += parseInt(insp.oos_total ?? "0", 10) || 0;
    }
  }

  // Insurance summary
  const bipdPolicies = insurance.filter(
    (p) =>
      p.mod_col_1?.toUpperCase().includes("BIPD") ||
      p.ins_form_code?.toUpperCase().includes("BIPD")
  );
  const cargoPolicies = insurance.filter(
    (p) =>
      p.mod_col_1?.toUpperCase().includes("CARGO") ||
      p.ins_form_code?.toUpperCase().includes("CARGO")
  );
  const bondPolicies = insurance.filter(
    (p) =>
      p.mod_col_1?.toUpperCase().includes("SURETY") ||
      p.mod_col_1?.toUpperCase().includes("BOND") ||
      p.ins_form_code?.toUpperCase().includes("SURETY") ||
      p.ins_form_code?.toUpperCase().includes("BOND")
  );

  const isHazmat = carrier.hm_ind === "Y";
  const bipdRequired = isHazmat ? 5_000_000 : 750_000;
  const bipdCoverage = bipdPolicies.length > 0
    ? Math.max(...bipdPolicies.map((p) => parseInt(p.max_cov_amount ?? "0", 10) || 0))
    : 0;

  // Determine MC number from docket prefix + number
  const mcNumber =
    carrier.docket1prefix && carrier.docket1
      ? `${carrier.docket1prefix}-${carrier.docket1}`
      : null;

  // Entity type from classdef
  const classdef = carrier.classdef?.toUpperCase() ?? "";
  let entityType = "Carrier";
  if (classdef.includes("BROKER") && !classdef.includes("AUTHORIZED FOR HIRE") && !classdef.includes("PRIVATE"))
    entityType = "Broker";
  else if (classdef.includes("BROKER"))
    entityType = "Carrier/Broker";
  else if (classdef.includes("FREIGHT FORWARDER"))
    entityType = "Freight Forwarder";

  // Company officers
  const officers = [carrier.company_officer_1, carrier.company_officer_2]
    .filter((o): o is string => !!o);

  const priorDot = carrier.prior_revoke_dot
    ? parseInt(carrier.prior_revoke_dot, 10) || null
    : null;

  return Response.json({
    usdot_number: dotNumber,
    mc_number: mcNumber,
    entity_type: entityType,
    legal_name: carrier.legal_name,
    dba_name: carrier.dba_name ?? null,
    status: decodeStatus(carrier.status_code),
    physical_address: {
      street: carrier.phy_street ?? null,
      city: carrier.phy_city ?? null,
      state: carrier.phy_state ?? null,
      zip: carrier.phy_zip ?? null,
    },
    mailing_address: {
      street: carrier.carrier_mailing_street ?? null,
      city: carrier.carrier_mailing_city ?? null,
      state: carrier.carrier_mailing_state ?? null,
      zip: carrier.carrier_mailing_zip ?? null,
    },
    phone: carrier.phone ?? null,
    power_units: parseInt(carrier.power_units ?? "0", 10) || 0,
    total_drivers: parseInt(carrier.total_drivers ?? "0", 10) || 0,
    mcs150_date: carrier.mcs150_date ?? null,
    operating_authority: operatingAuthority,
    insurance: {
      bipd_on_file: bipdPolicies.length > 0,
      bipd_required: bipdRequired,
      bipd_coverage: bipdCoverage,
      cargo_on_file: cargoPolicies.length > 0,
      bond_on_file: bondPolicies.length > 0,
    },
    safety_scores: safetyScores,
    inspections_24mo: {
      total: inspTotal,
      oos_total: inspOos,
      oos_rate: inspTotal > 0 ? Math.round((inspOos / inspTotal) * 10000) / 10000 : 0,
    },
    crashes_24mo: crashes24mo,
    anomaly_flags: anomalyFlags,
    authority_mill: {
      grant_count: authorityMill.grantCount,
      revoke_count: authorityMill.revokeCount,
      avg_days_between: authorityMill.avgDaysBetween,
      is_mill_pattern: authorityMill.isMillPattern,
    },
    broker_reincarnation: brokerReincarnation.isReincarnation
      ? {
          prior_dot: brokerReincarnation.priorDot,
          address_match: brokerReincarnation.addressMatch,
          phone_match: brokerReincarnation.phoneMatch,
          officer_match: brokerReincarnation.officerMatch,
        }
      : null,
    prior_revoke_dot: priorDot,
    company_officers: officers,
    extracted_at: new Date().toISOString(),
  });
}
