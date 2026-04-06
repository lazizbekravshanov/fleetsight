/**
 * query_address_cluster — find carriers sharing an address with this DOT.
 *
 * Address clusters are a chameleon-detection signal: when many carriers
 * register at the same address (especially commercial mailboxes), it's
 * often the same operator under different identities.
 */

import { getAddressAffiliates } from "@/lib/graph/address-clustering";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof getAddressAffiliates>>;

export const queryAddressCluster: AgentTool<{ dotNumber: string }, Output> = {
  name: "query_address_cluster",
  description:
    "Find other carriers that share a physical or mailing address with this USDOT (the address cluster). Useful for chameleon detection — multiple carriers at the same address often indicates a single operator running parallel identities. Returns affiliate DOTs and a cluster risk score.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    return getAddressAffiliates(dot);
  },
  summarize(out) {
    const o = out as { affiliates?: unknown[]; riskScore?: number };
    const count = Array.isArray(o.affiliates) ? o.affiliates.length : 0;
    if (count === 0) return "No address-sharing carriers found";
    const score = o.riskScore !== undefined ? `, cluster risk ${o.riskScore}` : "";
    return `${count} carriers at same address${score}`;
  },
  serializeForModel(out) {
    const o = out as { affiliates?: unknown[]; riskScore?: number };
    return JSON.stringify({
      riskScore: o.riskScore ?? null,
      affiliates: (o.affiliates ?? []).slice(0, 15),
    });
  },
};
