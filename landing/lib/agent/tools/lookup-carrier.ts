/**
 * lookup_carrier — fetch core FMCSA carrier identity, authority, status by USDOT.
 * Always called first when investigating a carrier.
 */

import { getCarrierByDot, type SocrataCarrier } from "@/lib/socrata";
import { getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import type { AgentTool } from "../types";

type Output = {
  socrata: SocrataCarrier;
  fmcsa: Record<string, unknown> | null;
};

export const lookupCarrier: AgentTool<{ dotNumber: string }, Output> = {
  name: "lookup_carrier",
  description:
    "Fetch core FMCSA carrier identity (legal name, DBA, address, MC number, power units, drivers, status, MCS-150 date, authority age) for a USDOT number. ALWAYS call this first when investigating a carrier — most other tools assume you know who the carrier is.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: {
      dotNumber: { type: "string", description: "USDOT number, digits only", pattern: "^\\d{1,10}$" },
    },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const [socrata, profile] = await Promise.all([
      getCarrierByDot(dot),
      getCarrierProfile(dotNumber).catch(() => null),
    ]);
    if (!socrata) throw new Error(`No carrier found for USDOT ${dotNumber}`);
    return { socrata, fmcsa: extractCarrierRecord(profile) };
  },
  summarize(out) {
    const c = out.socrata;
    const status = c.status_code === "A" ? "active" : c.status_code === "I" ? "inactive" : c.status_code || "?";
    return `${c.legal_name} (DOT ${c.dot_number}, ${c.phy_state || "?"}, ${c.power_units || "0"} units, ${status})`;
  },
  serializeForModel(out) {
    const c = out.socrata;
    const f = out.fmcsa || {};
    return JSON.stringify({
      dotNumber: c.dot_number,
      legalName: c.legal_name,
      dbaName: c.dba_name || null,
      mcNumber: c.docket1 ? `${c.docket1prefix || "MC"}${c.docket1}` : null,
      address: [c.phy_street, c.phy_city, c.phy_state, c.phy_zip].filter(Boolean).join(", "),
      phone: c.phone || null,
      cellPhone: c.cell_phone || null,
      email: c.email_address || null,
      powerUnits: numOrNull(c.power_units),
      totalDrivers: numOrNull(c.total_drivers),
      addDate: c.add_date || null,
      mcs150Date: c.mcs150_date || null,
      statusCode: c.status_code || null,
      docketStatusCode: c.docket1_status_code || null,
      classdef: c.classdef || null,
      hazmatInd: c.hm_ind || null,
      interstate: c.interstate || null,
      officer1: c.company_officer_1 || null,
      officer2: c.company_officer_2 || null,
      priorRevokeFlag: c.prior_revoke_flag || null,
      priorRevokeDot: c.prior_revoke_dot || null,
      businessOrg: c.business_org_desc || null,
      safetyRating: f.safetyRating ?? null,
      allowedToOperate: f.allowedToOperate ?? null,
    });
  },
};

function numOrNull(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}
