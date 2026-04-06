/**
 * find_affiliations — VIN-based carrier affiliation network.
 *
 * Returns the top affiliated carriers (sharing VINs with this DOT) ranked by
 * affiliation score, plus cluster membership if any.
 *
 * Wraps lib/affiliation-detection.getAffiliationsForCarrier(). The full
 * affiliation list is persisted to ToolCall.output for graph rendering.
 */

import { getAffiliationsForCarrier } from "@/lib/affiliation-detection";
import type { AgentTool } from "../types";

type Output = Awaited<ReturnType<typeof getAffiliationsForCarrier>>;

export const findAffiliations: AgentTool<{ dotNumber: string }, Output> = {
  name: "find_affiliations",
  description:
    "Find other carriers that share VINs (vehicles) with this USDOT — the VIN-based affiliation network. Returns the strongest affiliations ranked by overlap score, with the type of relationship (sister carrier, fleet sale, sequential ownership, etc.) and reason codes. Use this to map a carrier's network of related entities and detect chameleon clusters.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    return getAffiliationsForCarrier(dot);
  },
  summarize(out) {
    if (out.affiliations.length === 0) {
      return out.totalVins === 0 ? "No fleet VINs on record" : "No VIN-based affiliations found";
    }
    const top = out.affiliations[0];
    const cluster = out.cluster ? `, cluster of ${out.cluster.members.length}` : "";
    return `${out.affiliations.length} affiliated carriers (top: DOT ${top.dotNumber} score ${top.score}${cluster})`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      totalVins: out.totalVins,
      cluster: out.cluster
        ? { id: out.cluster.id, memberCount: out.cluster.members.length, members: out.cluster.members.slice(0, 20) }
        : null,
      topAffiliations: out.affiliations.slice(0, 10).map((a) => ({
        dotNumber: a.dotNumber,
        sharedVinCount: a.sharedVinCount,
        score: a.score,
        type: a.type,
        signals: a.signals,
        reasons: a.reasons.slice(0, 3),
      })),
    });
  },
};
