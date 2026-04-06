/**
 * watch_carrier — add a carrier to the user's watchlist (idempotent at two levels):
 *   1. Per-(userId, dotNumber): the WatchedCarrier table itself dedups.
 *   2. Per-(runId, toolUseId): the IdempotencyKey table prevents the case
 *      open from running twice if the runtime crashes between writes.
 *
 * The Watchdog cron will then re-investigate this carrier nightly and surface
 * deltas as MonitoringAlert rows.
 */

import type { AgentTool, AgentContext } from "../types";
import { withIdempotency, buildIdempotencyKey } from "../idempotency";

type Input = { dotNumber: string; legalName?: string; reason?: string };
type Output = { ok: true; alreadyWatched: boolean; caseId: string | null };

export const watchCarrier: AgentTool<Input, Output> = {
  name: "watch_carrier",
  description:
    "Add a carrier to the current user's watchlist. The Watchdog agent will re-investigate this carrier overnight and surface any material changes (new inspections, crashes, authority changes, insurance lapses) as alerts. Use this when the user says 'watch this' or when you've found a borderline carrier worth monitoring. Fully idempotent — safe to call repeatedly with the same input.",
  inputSchema: {
    type: "object",
    required: ["dotNumber"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      legalName: { type: "string", description: "Carrier legal name (for the watchlist UI label)" },
      reason: { type: "string", description: "Why the user/agent is watching this — stored as a Case title" },
    },
  },
  async execute(input, ctx: AgentContext) {
    const { dotNumber, legalName, reason } = input;

    // Layer 1: WatchedCarrier dedup by (userId, dotNumber)
    const existingWatch = await ctx.prisma.watchedCarrier.findFirst({
      where: { userId: ctx.userId, dotNumber },
    });
    if (existingWatch) {
      return { ok: true, alreadyWatched: true, caseId: null };
    }

    // Layer 2: idempotency key prevents the case-open from running twice
    // even if the runtime crashes between the two writes below.
    const key = buildIdempotencyKey("watch_carrier", input);

    await ctx.prisma.watchedCarrier.create({
      data: {
        userId: ctx.userId,
        dotNumber,
        legalName: legalName || `DOT ${dotNumber}`,
      },
    });

    const { resourceId } = await withIdempotency(ctx, key, "case", async () => {
      const c = await ctx.prisma.case.create({
        data: {
          userId: ctx.userId,
          dotNumber,
          kind: "monitoring",
          title: reason || `Watching ${legalName || `DOT ${dotNumber}`}`,
          status: "watching",
          sessionId: ctx.sessionId,
        },
      });
      return { id: c.id };
    });

    return { ok: true, alreadyWatched: false, caseId: resourceId };
  },
  summarize(out) {
    return out.alreadyWatched ? "Already on watchlist" : "Added to watchlist";
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};
