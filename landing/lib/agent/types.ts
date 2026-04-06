/**
 * Shared types for the FleetSight agent runtime.
 *
 * The runtime executes a Claude tool-use loop:
 *   - The model emits text + tool_use blocks
 *   - The runtime executes tools in parallel
 *   - Results are appended as tool_result blocks
 *   - Loop until stop_reason !== "tool_use"
 *
 * Every tool MUST return small, model-friendly output (≤2k tokens via
 * serializeForModel) and a one-line summary (≤200 char) for the SSE feed.
 * Raw tool results live in ToolCall rows; the model never sees them.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { PrismaClient } from "@prisma/client";

export interface AgentTool<I = unknown, O = unknown> {
  /** Tool name as the model sees it (snake_case). */
  name: string;
  /** Description shown to the model. Be specific about WHEN to call this. */
  description: string;
  /** JSONSchema for the tool's input. Anthropic validates against this. */
  inputSchema: Record<string, unknown>;
  /** Run the underlying lib function. Throws on failure. */
  execute(input: I, ctx: AgentContext): Promise<O>;
  /** ≤200 char human-readable one-liner shown in the SSE tool feed. */
  summarize(output: O): string;
  /** ≤2k token JSON the model sees as the tool_result. Truncate aggressively. */
  serializeForModel(output: O): string;
}

export interface AgentContext {
  userId: string;
  carrierDotNumber: string | null;
  runId: string;
  sessionId: string;
  prisma: PrismaClient;
  /** Tool callback to render an artifact in the UI right pane. */
  emitArtifact: (artifact: {
    type: string;
    title?: string;
    payload: unknown;
    citations: string[];
  }) => Promise<{ id: string }>;
}

/** Events the runtime pushes to the SSE stream. */
export type AgentEvent =
  | { type: "run_start"; runId: string; sessionId: string; persona: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call_start"; id: string; name: string; input: unknown }
  | { type: "tool_call_end"; id: string; ok: boolean; summary: string; durationMs: number }
  | { type: "text"; text: string }
  | { type: "artifact"; id: string; artifactType: string; title?: string; payload: unknown }
  | { type: "turn_end"; stopReason: string; tokensIn: number; tokensOut: number }
  | { type: "done"; runId: string }
  | { type: "error"; message: string };

export interface AgentRunResult {
  messages: Anthropic.MessageParam[];
  finalText: string;
  tokensIn: number;
  tokensOut: number;
  toolCallCount: number;
}

export interface RunAgentOptions {
  ctx: AgentContext;
  systemPrompt: string;
  tools: AgentTool[];
  messages: Anthropic.MessageParam[];
  emit: (event: AgentEvent) => void;
  /** Hard cap on tool-use loop iterations. Default 10. */
  maxTurns?: number;
  /** Max parallel tool executions per turn. Default 6. */
  maxParallelTools?: number;
  /** Abort signal from the request. */
  signal?: AbortSignal;
  /** Override model. Default from env AGENT_MODEL or claude-sonnet-4-5. */
  model?: string;
  /** Max tokens per response. Default 4096. */
  maxTokens?: number;
  /**
   * Test-only: inject a fake Anthropic client. Production callers should
   * leave this undefined; the runtime uses a lazy singleton from env.
   */
  _testClient?: Anthropic;
}
