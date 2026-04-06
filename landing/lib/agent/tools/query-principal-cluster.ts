/**
 * query_principal_cluster — find carriers sharing principals (officers) with this DOT.
 *
 * When the same person is the company officer on multiple carriers, especially
 * across DOTs that share other attributes, it's a chameleon/sister-carrier signal.
 */

import { getPrincipalAffiliates } from "@/lib/graph/principal-matching";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof getPrincipalAffiliates>>;

export const queryPrincipalCluster: AgentTool<{ dotNumber: string }, Output> = {
  name: "query_principal_cluster",
  description:
    "Find other carriers whose company officers (principals) match this USDOT's officers. The strongest sister-carrier signal: same person, different DOT. Use this to map a single operator's portfolio of registered entities.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    return getPrincipalAffiliates(dot);
  },
  summarize(out) {
    const o = out as { affiliates?: unknown[] };
    const count = Array.isArray(o.affiliates) ? o.affiliates.length : 0;
    return count === 0
      ? "No carriers sharing principals"
      : `${count} carrier${count === 1 ? "" : "s"} share principals`;
  },
  serializeForModel(out) {
    const o = out as Record<string, unknown>;
    const compact: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      compact[k] = Array.isArray(v) ? v.slice(0, 15) : v;
    }
    return JSON.stringify(compact).slice(0, 4000);
  },
};
