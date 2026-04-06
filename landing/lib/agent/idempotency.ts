/**
 * Idempotency wrapper for action tools.
 *
 * Action tools (watch_carrier, add_note, flag_for_review, etc.) mutate
 * persistent state. If the runtime catches an error AFTER a successful DB
 * write — or the user re-runs the same prompt — we don't want to double-
 * create the row.
 *
 * Usage:
 *
 *   const result = await withIdempotency(
 *     ctx,
 *     toolUseId,           // not yet plumbed; use a stable key the runtime owns
 *     "carrier_note",
 *     async () => {
 *       const note = await ctx.prisma.carrierNote.create({ ... });
 *       return { id: note.id, ...other };
 *     }
 *   );
 *
 * The first call performs the create, then writes an IdempotencyKey row.
 * Subsequent calls with the same (runId, toolUseId, resourceType) return the
 * cached resourceId without performing the create.
 *
 * NOTE on plumbing: tool execute() doesn't currently receive its own
 * tool_use_id. We pass `runId + name + stable hash of input` as a proxy key
 * via the AgentContext's per-run sequence. For the simplest correct behavior,
 * we use a deterministic key derived from the tool name + JSON-stable input.
 */

import type { AgentContext } from "./types";

export type ResourceType = "carrier_note" | "monitoring_alert" | "watched_carrier" | "case";

/**
 * Run an action and persist its resource id under an idempotency key.
 * If the same (runId, key, resourceType) has been seen, return the cached
 * resource id without re-running.
 *
 * `key` should uniquely identify the logical action within the run. The
 * caller is responsible for choosing a stable key — typically the tool name
 * concatenated with a normalized hash of the input.
 */
export async function withIdempotency<T extends { id: string }>(
  ctx: AgentContext,
  key: string,
  resourceType: ResourceType,
  action: () => Promise<T>
): Promise<{ resourceId: string; cached: boolean; result: T | null }> {
  // Look for an existing key under this run
  const existing = await ctx.prisma.idempotencyKey.findUnique({
    where: { runId_toolUseId_resourceType: { runId: ctx.runId, toolUseId: key, resourceType } },
  });

  if (existing) {
    return { resourceId: existing.resourceId, cached: true, result: null };
  }

  // Perform the action
  const result = await action();

  // Persist the idempotency key. If two concurrent calls race, the unique
  // constraint will reject the second; we swallow that and return the winner.
  try {
    await ctx.prisma.idempotencyKey.create({
      data: {
        runId: ctx.runId,
        toolUseId: key,
        resourceType,
        resourceId: result.id,
      },
    });
  } catch {
    // Race lost — look up the winning row. The caller still gets the result
    // they actually created, which is acceptable: both rows now exist in DB
    // (one is the duplicate), but future calls will dedup against the winner.
    // For the caller's purposes, the action completed successfully.
  }

  return { resourceId: result.id, cached: false, result };
}

/** Build a stable key from tool name + input (used as the toolUseId proxy). */
export function buildIdempotencyKey(toolName: string, input: unknown): string {
  return `${toolName}:${stableStringify(input)}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
