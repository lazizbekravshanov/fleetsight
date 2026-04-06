/**
 * fetch_authority_history — operating-authority grants, revocations, suspensions.
 *
 * Critical for chameleon detection: rapid grant→revoke→regrant cycles indicate
 * authority-mill behavior.
 */

import { getAuthorityHistoryByDot, type SocrataAuthorityHistory } from "@/lib/socrata";
import type { AgentTool } from "../types";

type Output = {
  total: number;
  records: SocrataAuthorityHistory[];
  rollup: {
    grants: number;
    revocations: number;
    suspensions: number;
    activeAuthorities: number;
    earliestGrant: string | null;
    latestAction: string | null;
    types: string[];
  };
};

export const fetchAuthorityHistory: AgentTool<{ dotNumber: string }, Output> = {
  name: "fetch_authority_history",
  description:
    "Fetch operating-authority history (grants, revocations, suspensions, reinstatements) for a USDOT. Use this to detect authority-mill patterns and track when authority became active. Multiple revocations or rapid grant cycles are critical red flags.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: { dotNumber: { type: "string", pattern: "^\\d{1,10}$" } },
  },
  async execute({ dotNumber }) {
    const dot = parseInt(dotNumber, 10);
    if (!Number.isFinite(dot)) throw new Error(`Invalid USDOT: ${dotNumber}`);
    const records = await getAuthorityHistoryByDot(dot);
    return { total: records.length, records, rollup: rollup(records) };
  },
  summarize(out) {
    if (out.total === 0) return "No authority history on file";
    const r = out.rollup;
    return `${r.grants} grants, ${r.revocations} revocations, ${r.suspensions} suspensions`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      rollup: out.rollup,
      events: out.records.slice(0, 12).map((r) => ({
        type: r.mod_col_1 || null,
        action: r.disp_action_desc || r.original_action_desc || null,
        decided: r.disp_decided_date || null,
        served: r.disp_served_date || r.orig_served_date || null,
      })),
    });
  },
};

function rollup(records: SocrataAuthorityHistory[]): Output["rollup"] {
  let grants = 0;
  let revocations = 0;
  let suspensions = 0;
  let activeAuthorities = 0;
  let earliestGrant: string | null = null;
  let latestAction: string | null = null;
  const types = new Set<string>();

  for (const r of records) {
    const orig = (r.original_action_desc || "").toUpperCase();
    const disp = (r.disp_action_desc || "").toUpperCase();
    if (orig.includes("GRANT")) {
      grants++;
      if (r.orig_served_date && (!earliestGrant || r.orig_served_date < earliestGrant)) {
        earliestGrant = r.orig_served_date;
      }
    }
    if (disp.includes("REVOKE")) revocations++;
    if (disp.includes("SUSPEND")) suspensions++;
    if (!disp || disp.includes("REINSTATED")) activeAuthorities++;
    if (r.mod_col_1) types.add(r.mod_col_1);
    const action = r.disp_served_date || r.orig_served_date;
    if (action && (!latestAction || action > latestAction)) latestAction = action;
  }

  return {
    grants,
    revocations,
    suspensions,
    activeAuthorities,
    earliestGrant,
    latestAction,
    types: Array.from(types),
  };
}
