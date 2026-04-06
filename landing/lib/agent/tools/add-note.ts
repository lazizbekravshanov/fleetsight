/**
 * add_note — write a CarrierNote on behalf of the user. Idempotent within
 * a run via (runId, tool name + input) — a re-execute of the same logical
 * action returns the previously-created note instead of duplicating.
 */

import type { AgentTool, AgentContext } from "../types";
import { withIdempotency, buildIdempotencyKey } from "../idempotency";

type Input = { dotNumber: string; content: string };
type Output = { ok: true; noteId: string; cached: boolean };

export const addNote: AgentTool<Input, Output> = {
  name: "add_note",
  description:
    "Persist a freeform note about a carrier on behalf of the user. Notes appear in the user's carrier notes list and survive across sessions. Use this when the user says 'note that' or when you want to leave a comment for the user to find later. Idempotent — calling with identical content within a run is a no-op.",
  inputSchema: {
    type: "object",
    required: ["dotNumber", "content"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      content: { type: "string", maxLength: 4000 },
    },
  },
  async execute(input, ctx: AgentContext) {
    const key = buildIdempotencyKey("add_note", input);
    const { resourceId, cached } = await withIdempotency(ctx, key, "carrier_note", async () => {
      const note = await ctx.prisma.carrierNote.create({
        data: { userId: ctx.userId, dotNumber: input.dotNumber, content: input.content },
      });
      return { id: note.id };
    });
    return { ok: true, noteId: resourceId, cached };
  },
  summarize(out) {
    return out.cached ? `Note already saved (${out.noteId.slice(0, 8)})` : `Note saved (${out.noteId.slice(0, 8)})`;
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};
