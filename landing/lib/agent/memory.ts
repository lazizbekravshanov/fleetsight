/**
 * Agent memory loader.
 *
 * Three layers:
 *   1. Carrier observations — facts ANY user investigating this carrier should
 *      see (scope: carrierDotNumber set, userId null). Persist via add_observation.
 *   2. User preferences — focus areas, tone preferences, role context that the
 *      agent should adapt to (scope: userId set, carrierDotNumber null).
 *   3. Conversation history — persisted as AgentMessage rows; loaded by route.
 *
 * Returns formatted prompt fragments to splice into the system prompt at
 * the start of each agent run.
 */

import type { PrismaClient } from "@prisma/client";

export type LoadedMemory = {
  observations: string[];
  preferences: string[];
  systemPromptAddendum: string;
};

const MAX_OBSERVATIONS = 12;
const MAX_PREFERENCES = 6;

export async function loadMemoryForRun(
  prisma: PrismaClient,
  userId: string,
  carrierDotNumber: string | null
): Promise<LoadedMemory> {
  const [observations, preferences] = await Promise.all([
    carrierDotNumber
      ? prisma.agentMemory.findMany({
          where: { carrierDotNumber, kind: "observation" },
          orderBy: { createdAt: "desc" },
          take: MAX_OBSERVATIONS,
        })
      : Promise.resolve([]),
    prisma.agentMemory.findMany({
      where: { userId, kind: "preference" },
      orderBy: { createdAt: "desc" },
      take: MAX_PREFERENCES,
    }),
  ]);

  const obsLines = observations.map((m) => m.content);
  const prefLines = preferences.map((m) => m.content);

  const fragments: string[] = [];

  if (prefLines.length > 0) {
    fragments.push(
      `# User context\n${prefLines.map((p) => `- ${p}`).join("\n")}\n\nAdapt your tone, focus, and depth to these user preferences.`
    );
  }

  if (obsLines.length > 0) {
    fragments.push(
      `# Persistent carrier observations${carrierDotNumber ? ` (DOT ${carrierDotNumber})` : ""}\n` +
        `These facts have been recorded by prior investigation runs. Treat them as established context, not as new findings:\n` +
        obsLines.map((o) => `- ${o}`).join("\n")
    );
  }

  return {
    observations: obsLines,
    preferences: prefLines,
    systemPromptAddendum: fragments.length > 0 ? "\n\n---\n\n" + fragments.join("\n\n") : "",
  };
}

/**
 * Rough token estimate for the conversation history. We don't want to load
 * the tokenizer; this is a heuristic (4 chars ≈ 1 token).
 */
export function estimateMessagesTokens(jsonStrings: string[]): number {
  let chars = 0;
  for (const s of jsonStrings) chars += s.length;
  return Math.round(chars / 4);
}

const SOFT_TOKEN_BUDGET = 80_000;

/**
 * If conversation history is over the soft budget, drop the OLDEST messages
 * until we're under it (always keep the most recent 6 turns regardless).
 *
 * Returns the kept indices and the count of dropped messages. The dropped
 * messages are NOT deleted from DB — only excluded from the in-context window.
 */
export function trimConversationToFit(
  messageContents: string[],
  budget: number = SOFT_TOKEN_BUDGET
): { keptIndices: number[]; droppedCount: number } {
  const total = estimateMessagesTokens(messageContents);
  if (total <= budget) {
    return { keptIndices: messageContents.map((_, i) => i), droppedCount: 0 };
  }

  const kept: number[] = [];
  let runningTokens = 0;

  // Always keep the most recent 6 messages
  const minKeep = Math.min(6, messageContents.length);
  const lockedStart = messageContents.length - minKeep;

  for (let i = messageContents.length - 1; i >= lockedStart; i--) {
    runningTokens += estimateMessagesTokens([messageContents[i]]);
    kept.unshift(i);
  }

  // Walk backward from older messages, including any that fit
  for (let i = lockedStart - 1; i >= 0; i--) {
    const cost = estimateMessagesTokens([messageContents[i]]);
    if (runningTokens + cost > budget) break;
    runningTokens += cost;
    kept.unshift(i);
  }

  return { keptIndices: kept, droppedCount: messageContents.length - kept.length };
}
