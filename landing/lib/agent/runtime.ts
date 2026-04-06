/**
 * FleetSight agent runtime — Claude tool-use loop.
 *
 * Responsibilities:
 *   1. Stream a Claude response, surfacing text deltas as `thinking` events
 *   2. On stop_reason === "tool_use": execute tool_use blocks in parallel
 *      (capped at maxParallelTools), emit tool_call_start/end SSE events,
 *      persist ToolCall rows, append tool_result blocks to the message list
 *   3. Loop until stop_reason !== "tool_use" or maxTurns reached
 *
 * Critical contracts:
 *   - Tool outputs serialized via tool.serializeForModel() — never raw payloads.
 *     Raw payloads live in ToolCall.output for the UI to lazy-fetch.
 *   - Per-run dedup cache: identical tool+input within a single run returns
 *     the same Promise. Models occasionally re-call the same tool.
 *   - Errors in one tool don't kill the run — they become tool_result is_error
 *     blocks the model can react to.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import type { RunAgentOptions, AgentRunResult, AgentTool } from "./types";

const DEFAULT_MODEL = process.env.AGENT_MODEL || "claude-sonnet-4-5";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function runAgent(opts: RunAgentOptions): Promise<AgentRunResult> {
  return Sentry.startSpan(
    {
      name: "agent.run",
      op: "agent.run",
      attributes: {
        "agent.run_id": opts.ctx.runId,
        "agent.session_id": opts.ctx.sessionId,
        "agent.user_id": opts.ctx.userId,
        "agent.carrier_dot": opts.ctx.carrierDotNumber ?? "",
        "agent.tool_count": opts.tools.length,
      },
    },
    () => runAgentInner(opts)
  );
}

async function runAgentInner(opts: RunAgentOptions): Promise<AgentRunResult> {
  const client = opts._testClient ?? getClient();
  const {
    ctx,
    systemPrompt,
    tools,
    emit,
    maxTurns = 10,
    maxParallelTools = 6,
    signal,
    model = DEFAULT_MODEL,
    maxTokens = 4096,
  } = opts;

  const messages: Anthropic.MessageParam[] = [...opts.messages];
  const toolDefs = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
  const toolByName = new Map<string, AgentTool>(tools.map((t) => [t.name, t]));

  // Per-run dedup cache: identical (toolName + JSON.stringify(input)) => same Promise
  const dedupCache = new Map<string, Promise<unknown>>();

  let totalIn = 0;
  let totalOut = 0;
  let toolCallCount = 0;
  let finalText = "";

  for (let turn = 0; turn < maxTurns; turn++) {
    if (signal?.aborted) throw new Error("Agent run aborted");

    const final = await Sentry.startSpan(
      {
        name: `agent.turn.${turn}`,
        op: "agent.turn",
        attributes: { "agent.turn": turn, "agent.model": model },
      },
      async () => {
        const stream = client.messages.stream({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          tools: toolDefs,
          messages,
        });

        // Stream text deltas as `thinking` events. The terminal turn's deltas
        // are promoted to `text` style by the UI when status flips to idle.
        stream.on("text", (delta) => {
          if (delta) emit({ type: "thinking", text: delta });
        });

        try {
          return await stream.finalMessage();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          Sentry.captureException(err, {
            tags: { agent_run_id: ctx.runId, turn: String(turn) },
          });
          throw new Error(`Anthropic stream failed: ${msg}`);
        }
      }
    );

    totalIn += final.usage.input_tokens;
    totalOut += final.usage.output_tokens;

    // Always append the assistant turn so subsequent calls see the full history
    messages.push({ role: "assistant", content: final.content });

    if (final.stop_reason !== "tool_use") {
      // Terminal turn — gather final user-facing text
      finalText = final.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      emit({
        type: "turn_end",
        stopReason: final.stop_reason || "end_turn",
        tokensIn: totalIn,
        tokensOut: totalOut,
      });
      return { messages, finalText, tokensIn: totalIn, tokensOut: totalOut, toolCallCount };
    }

    // Execute tool_use blocks in parallel (capped)
    const toolUses = final.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const results = await executeToolsParallel(
      toolUses,
      toolByName,
      ctx,
      emit,
      dedupCache,
      maxParallelTools
    );
    toolCallCount += results.length;

    // Append tool_result blocks as a single user turn
    messages.push({
      role: "user",
      content: results.map((r) => r.toolResultBlock),
    });

    emit({
      type: "turn_end",
      stopReason: final.stop_reason,
      tokensIn: totalIn,
      tokensOut: totalOut,
    });
  }

  throw new Error(`Agent exceeded maxTurns (${maxTurns})`);
}

interface ToolExecutionResult {
  toolUseId: string;
  toolResultBlock: Anthropic.ToolResultBlockParam;
}

async function executeToolsParallel(
  toolUses: Anthropic.ToolUseBlock[],
  toolByName: Map<string, AgentTool>,
  ctx: import("./types").AgentContext,
  emit: import("./types").RunAgentOptions["emit"],
  dedupCache: Map<string, Promise<unknown>>,
  maxParallel: number
): Promise<ToolExecutionResult[]> {
  // Simple semaphore: process in chunks of maxParallel
  const results: ToolExecutionResult[] = [];
  for (let i = 0; i < toolUses.length; i += maxParallel) {
    const chunk = toolUses.slice(i, i + maxParallel);
    const chunkResults = await Promise.all(
      chunk.map((tu) => executeOneTool(tu, toolByName, ctx, emit, dedupCache))
    );
    results.push(...chunkResults);
  }
  return results;
}

async function executeOneTool(
  tu: Anthropic.ToolUseBlock,
  toolByName: Map<string, AgentTool>,
  ctx: import("./types").AgentContext,
  emit: import("./types").RunAgentOptions["emit"],
  dedupCache: Map<string, Promise<unknown>>
): Promise<ToolExecutionResult> {
  return Sentry.startSpan(
    {
      name: `agent.tool.${tu.name}`,
      op: "agent.tool",
      attributes: {
        "agent.tool.name": tu.name,
        "agent.tool.use_id": tu.id,
        "agent.run_id": ctx.runId,
      },
    },
    async () => {
      const tool = toolByName.get(tu.name);

      // Unknown tool — emit error result so the model can recover
      if (!tool) {
        const msg = `Unknown tool: ${tu.name}`;
        emit({ type: "tool_call_start", id: tu.id, name: tu.name, input: tu.input });
        emit({ type: "tool_call_end", id: tu.id, ok: false, summary: msg, durationMs: 0 });
        await persistToolCall(ctx, tu, msg, "", false, 0);
        return {
          toolUseId: tu.id,
          toolResultBlock: {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            is_error: true,
            content: msg,
          },
        };
      }

      emit({ type: "tool_call_start", id: tu.id, name: tu.name, input: tu.input });
      const startedAt = Date.now();
      const cacheKey = `${tu.name}:${stableStringify(tu.input)}`;

      try {
        let promise = dedupCache.get(cacheKey);
        if (!promise) {
          promise = tool.execute(tu.input, ctx);
          dedupCache.set(cacheKey, promise);
        }
        const output = await promise;
        const summary = tool.summarize(output as never).slice(0, 200);
        const serialized = tool.serializeForModel(output as never);
        const durationMs = Date.now() - startedAt;

        emit({ type: "tool_call_end", id: tu.id, ok: true, summary, durationMs });
        await persistToolCall(ctx, tu, summary, serialized, true, durationMs, output);

        return {
          toolUseId: tu.id,
          toolResultBlock: {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            content: serialized,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const durationMs = Date.now() - startedAt;
        emit({ type: "tool_call_end", id: tu.id, ok: false, summary: message, durationMs });
        await persistToolCall(ctx, tu, message, "", false, durationMs);
        Sentry.captureException(err, {
          tags: {
            agent_tool: tu.name,
            agent_run_id: ctx.runId,
            tool_use_id: tu.id,
          },
        });
        return {
          toolUseId: tu.id,
          toolResultBlock: {
            type: "tool_result" as const,
            tool_use_id: tu.id,
            is_error: true,
            content: `Tool error: ${message}`,
          },
        };
      }
    }
  );
}

async function persistToolCall(
  ctx: import("./types").AgentContext,
  tu: Anthropic.ToolUseBlock,
  summary: string,
  serializedOutput: string,
  ok: boolean,
  durationMs: number,
  rawOutput?: unknown
): Promise<void> {
  try {
    await ctx.prisma.toolCall.create({
      data: {
        runId: ctx.runId,
        toolUseId: tu.id,
        name: tu.name,
        input: stableStringify(tu.input),
        output: rawOutput !== undefined ? safeJsonStringify(rawOutput) : serializedOutput || null,
        summary: summary.slice(0, 200),
        ok,
        durationMs,
      },
    });
  } catch {
    // Don't let DB errors kill the agent run; log via Sentry later in Phase 11
  }
}

/** Deterministic JSON stringify for cache keys. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Stringify with a size cap so we don't blow up Prisma rows. */
function safeJsonStringify(value: unknown, maxLen = 50_000): string {
  try {
    const s = JSON.stringify(value);
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + "...[truncated]";
  } catch {
    return String(value).slice(0, maxLen);
  }
}
