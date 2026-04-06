/**
 * fetch_vehicle_complaints — NHTSA consumer complaints for a make/model/year.
 */

import { getComplaintsByVehicle } from "@/lib/nhtsa";
import type { AgentTool } from "../types";

type Input = { make: string; model: string; year: string };
type Output = Awaited<ReturnType<typeof getComplaintsByVehicle>>;

export const fetchVehicleComplaints: AgentTool<Input, Output> = {
  name: "fetch_vehicle_complaints",
  description:
    "Fetch NHTSA consumer complaints for a vehicle make/model/year. Useful for spotting recurring vehicle issues that might be driving inspections (e.g. brake complaints on a model that's also failing brake inspections).",
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
    return getComplaintsByVehicle(make, model, year);
  },
  summarize(out) {
    const list = Array.isArray(out) ? out : [];
    return list.length === 0 ? "No complaints" : `${list.length} complaint${list.length === 1 ? "" : "s"}`;
  },
  serializeForModel(out) {
    const list = Array.isArray(out) ? out : [];
    return JSON.stringify({ complaints: list.slice(0, 8) });
  },
};
