/**
 * fetch_background_checks — OFAC, SAM, EDGAR, courts, OSHA, EPA, address intel.
 *
 * Wraps lib/background.runBackgroundChecks(). Internally fetches the carrier
 * record first because the background pipeline takes a SocrataCarrier.
 */

import { getCarrierByDot } from "@/lib/socrata";
import { runBackgroundChecks } from "@/lib/background";
import type { AgentTool } from "../types";

type BackgroundResult = Awaited<ReturnType<typeof runBackgroundChecks>>;
type Output = { carrierFound: boolean; data: BackgroundResult | null };

export const fetchBackgroundChecks: AgentTool<{ dotNumber: string }, Output> = {
  name: "fetch_background_checks",
  description:
    "Run a comprehensive background check for a USDOT: OFAC sanctions screening, SAM.gov exclusions, SEC EDGAR, court records (CourtListener), bankruptcies, OSHA violations, EPA enforcement, address intelligence, and officer cross-references via OpenCorporates. Slower than other tools (multiple external APIs in parallel) — call only when investigating a flagged or high-stakes carrier.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const carrier = await getCarrierByDot(dot);
    if (!carrier) return { carrierFound: false, data: null };
    const data = await runBackgroundChecks(carrier);
    return { carrierFound: true, data };
  },
  summarize(out) {
    if (!out.carrierFound || !out.data) return "Carrier not found";
    const d = out.data;
    const flags: string[] = [];
    if (d.ofacMatches?.length) flags.push(`OFAC:${d.ofacMatches.length}`);
    if (d.samExclusions?.length) flags.push(`SAM:${d.samExclusions.length}`);
    if (d.bankruptcyCases?.length) flags.push(`bankruptcy:${d.bankruptcyCases.length}`);
    if (d.oshaViolations?.length) flags.push(`OSHA:${d.oshaViolations.length}`);
    if (d.epaEnforcements?.length) flags.push(`EPA:${d.epaEnforcements.length}`);
    if (d.courtCases?.length) flags.push(`court:${d.courtCases.length}`);
    return flags.length === 0 ? "Background check clean" : flags.join(", ");
  },
  serializeForModel(out) {
    if (!out.carrierFound || !out.data) return JSON.stringify({ found: false });
    const d = out.data;
    return JSON.stringify({
      found: true,
      ofacMatches: (d.ofacMatches || []).slice(0, 3),
      samExclusions: (d.samExclusions || []).slice(0, 3),
      edgarFilings: (d.edgarFilings || []).slice(0, 3),
      courtCases: (d.courtCases || []).slice(0, 5),
      bankruptcyCases: (d.bankruptcyCases || []).slice(0, 3),
      oshaViolations: (d.oshaViolations || []).slice(0, 5),
      epaEnforcements: (d.epaEnforcements || []).slice(0, 5),
      officerCrossRefs: (d.officerCrossRefs || []).slice(0, 5),
      mailingAddressMatches: (d.mailingAddressMatches || []).slice(0, 5),
      digitalFootprint: d.digitalFootprint,
      addressIntelligence: d.addressIntelligence,
    }).slice(0, 4500);
  },
};
