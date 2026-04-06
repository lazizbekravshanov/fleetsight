/**
 * add_observation — record a long-lived fact about a carrier into AgentMemory.
 *
 * Carrier-scoped observations (userId=null) are facts ANY user investigating
 * this carrier should know. Used by the agent to remember findings across
 * sessions ("this DOT is a known sister of DOT 123" — load on next visit).
 */

import type { AgentTool, AgentContext } from "../types";

type Input = {
  observation: string;
  scope?: "carrier" | "user";
};

type Output = { id: string };

export const addObservation: AgentTool<Input, Output> = {
  name: "add_observation",
  description:
    "Record a durable observation about the current carrier (or user preference) into long-term memory. Use this when you have learned something the agent should remember on every future visit to this carrier — e.g. 'This DOT is a known sister of DOT 4567890' or 'Cluster member, do not assess in isolation'. The user will see these as carrier notes; future runs will see them automatically. Keep observations concise (one sentence) and factual.",
  inputSchema: {
    type: "object",
    required: ["observation"],
    properties: {
      observation: { type: "string", maxLength: 500 },
      scope: { type: "string", enum: ["carrier", "user"], description: "carrier (default) or user preference" },
    },
  },
  async execute({ observation, scope = "carrier" }, ctx: AgentContext) {
    const memory = await ctx.prisma.agentMemory.create({
      data: {
        userId: scope === "user" ? ctx.userId : null,
        carrierDotNumber: scope === "carrier" ? ctx.carrierDotNumber : null,
        kind: scope === "user" ? "preference" : "observation",
        content: observation,
        sourceRunId: ctx.runId,
      },
    });
    return { id: memory.id };
  },
  summarize() {
    return "Observation recorded";
  },
  serializeForModel(out) {
    return JSON.stringify({ ok: true, id: out.id });
  },
};
