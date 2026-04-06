/**
 * fetch_corporate_network — OpenCorporates officer + entity network.
 *
 * Goes beyond FMCSA: pulls Secretary-of-State / OpenCorporates data to find
 * what other companies the officers run.
 */

import { getCarrierByDot } from "@/lib/socrata";
import { buildCorporateNetwork } from "@/lib/opencorporates";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof buildCorporateNetwork>>;

export const fetchCorporateNetwork: AgentTool<{ dotNumber: string }, Output> = {
  name: "fetch_corporate_network",
  description:
    "Pull OpenCorporates / Secretary-of-State data on the carrier's officers and find what OTHER companies (not just trucking) those officers run. Powerful for chameleon detection — if an officer of this DOT also runs a defunct prior trucking company, that's a strong signal. Slower than FMCSA tools (external API).",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const carrier = await getCarrierByDot(dot);
    if (!carrier) throw new Error(`No carrier found for USDOT ${dotNumber}`);
    const officers = [carrier.company_officer_1, carrier.company_officer_2].filter(
      (o): o is string => Boolean(o && o.trim())
    );
    return buildCorporateNetwork(carrier.legal_name, officers, carrier.phy_state);
  },
  summarize(out) {
    const o = out as Record<string, unknown>;
    const registrations = Array.isArray(o.companyRegistrations) ? o.companyRegistrations.length : 0;
    return `${registrations} company registration${registrations === 1 ? "" : "s"} found`;
  },
  serializeForModel(out) {
    const o = out as Record<string, unknown>;
    const compact: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      compact[k] = Array.isArray(v) ? v.slice(0, 10) : v;
    }
    return JSON.stringify(compact).slice(0, 4000);
  },
};
