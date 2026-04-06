/**
 * fetch_enablers — third-party agents (formation, insurance, BOC-3) tied to this carrier.
 *
 * "Enablers" are the formation agents, BOC-3 process agents, and insurance
 * agents that appear repeatedly across high-risk carriers. A carrier serviced
 * by a known bad-actor agent inherits some risk by association.
 */

import { getCarrierEnablers } from "@/lib/enablers/scoring";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof getCarrierEnablers>>;

export const fetchEnablers: AgentTool<{ dotNumber: string }, Output> = {
  name: "fetch_enablers",
  description:
    "Fetch the formation agents, BOC-3 process agents, and insurance agents tied to this USDOT, with their risk tier and active client count. A high-risk-tier enabler servicing many troubled carriers is a guilt-by-association signal worth surfacing.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    return getCarrierEnablers(dotNumber);
  },
  summarize(out) {
    const list = out.enablers ?? [];
    return list.length === 0 ? "No enablers found" : `${list.length} enabler${list.length === 1 ? "" : "s"} linked`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      enablers: (out.enablers ?? []).slice(0, 10),
      warnings: out.warnings ?? [],
    }).slice(0, 4000);
  },
};
