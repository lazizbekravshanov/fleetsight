/**
 * search_carriers — find carriers by name, address, or shared officer.
 *
 * Lets the agent expand its investigation outward from one carrier to its
 * neighborhood (sister carriers at the same address, other carriers run by
 * the same officer, etc.).
 */

import {
  searchCarriers,
  searchCarriersByAddress,
  searchCarriersByOfficer,
  type SocrataCarrier,
} from "@/lib/socrata";
import type { AgentTool } from "../types";

type Input = {
  by: "name" | "address" | "officer";
  query?: string;
  street?: string;
  city?: string;
  state?: string;
  officerName?: string;
  limit?: number;
};

type Output = { results: SocrataCarrier[]; mode: string };

export const searchCarriersTool: AgentTool<Input, Output> = {
  name: "search_carriers",
  description:
    "Search the FMCSA carrier registry by company name, by physical address, or by company officer name. Use this when investigating chameleon networks — to find sister carriers sharing an address or run by the same person.",
  inputSchema: {
    type: "object",
    required: ["by"],
    properties: {
      by: { type: "string", enum: ["name", "address", "officer"] },
      query: { type: "string", description: "Required when by=name. Carrier name fragment." },
      street: { type: "string", description: "Required when by=address." },
      city: { type: "string", description: "Required when by=address." },
      state: { type: "string", description: "Required when by=address. Two-letter abbrev." },
      officerName: { type: "string", description: "Required when by=officer." },
      limit: { type: "integer", minimum: 1, maximum: 50 },
    },
  },
  async execute(input) {
    const limit = Math.min(input.limit ?? 20, 50);
    let results: SocrataCarrier[] = [];
    if (input.by === "name") {
      if (!input.query) throw new Error("query is required when by=name");
      results = await searchCarriers(input.query, limit);
    } else if (input.by === "address") {
      if (!input.street || !input.city || !input.state) {
        throw new Error("street, city, state required when by=address");
      }
      results = await searchCarriersByAddress(input.street, input.city, input.state, limit);
    } else if (input.by === "officer") {
      if (!input.officerName) throw new Error("officerName required when by=officer");
      results = await searchCarriersByOfficer(input.officerName, limit);
    }
    return { results, mode: input.by };
  },
  summarize(out) {
    return `${out.results.length} carriers found by ${out.mode}`;
  },
  serializeForModel(out) {
    return JSON.stringify({
      mode: out.mode,
      results: out.results.slice(0, 20).map((c) => ({
        dotNumber: c.dot_number,
        legalName: c.legal_name,
        dba: c.dba_name || null,
        state: c.phy_state || null,
        powerUnits: c.power_units || null,
        statusCode: c.status_code || null,
      })),
    });
  },
};
