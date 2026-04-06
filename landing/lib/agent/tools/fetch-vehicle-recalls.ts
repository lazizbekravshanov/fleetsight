/**
 * fetch_vehicle_recalls — NHTSA recalls for a make/model/year.
 */

import { getRecallsByVehicle } from "@/lib/nhtsa";
import type { AgentTool } from "../types";

type Input = { make: string; model: string; year: string };
type Output = Awaited<ReturnType<typeof getRecallsByVehicle>>;

export const fetchVehicleRecalls: AgentTool<Input, Output> = {
  name: "fetch_vehicle_recalls",
  description:
    "Fetch NHTSA open recalls for a vehicle make/model/year combination. Use this when investigating whether a carrier's fleet has known model-level recalls (typically run after fetch_fleet_vins to get the make/model/year).",
  inputSchema: {
    type: "object",
    required: ["make", "model", "year"],
    properties: {
      make: { type: "string" },
      model: { type: "string" },
      year: { type: "string" },
    },
  },
  async execute({ make, model, year }) {
    return getRecallsByVehicle(make, model, year);
  },
  summarize(out) {
    const list = Array.isArray(out) ? out : [];
    return list.length === 0 ? "No recalls" : `${list.length} recall${list.length === 1 ? "" : "s"} on file`;
  },
  serializeForModel(out) {
    const list = Array.isArray(out) ? out : [];
    return JSON.stringify({ recalls: list.slice(0, 8) });
  },
};
