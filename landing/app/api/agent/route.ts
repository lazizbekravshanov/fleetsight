/**
 * /api/agent — main agent SSE endpoint.
 *
 * Replaces the old /api/chat dumb-streamer. Accepts POST and streams named
 * SSE events: run_start, thinking, tool_call_start, tool_call_end, text,
 * artifact, turn_end, done, error.
 *
 * Authentication: NextAuth cookie (set by getServerAuthSession). Browser
 * EventSource cannot send custom headers, so cookie auth is mandatory.
 *
 * Runtime: Node (Prisma + NextAuth require it). maxDuration extended for
 * multi-tool agent runs that can take 30-60s.
 */

import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { runAgent } from "@/lib/agent/runtime";
import { pickTools } from "@/lib/agent/tools";
import { createSseSender, SSE_HEADERS } from "@/lib/agent/sse";
import { getPersona } from "@/lib/agent/personas";
import { loadMemoryForRun, trimConversationToFit } from "@/lib/agent/memory";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http";
import type { AgentEvent } from "@/lib/agent/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RequestBody = {
  sessionId?: string;
  carrierDotNumber?: string | null;
  message?: string;
  persona?: string;
  kind?: "user_turn" | "auto_brief" | "persona_switch";
};

export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return jsonError("Unauthorized", 401);

  // Defense in depth: per-user rate limit on agent runs to cap Anthropic spend
  // even if a session token is leaked. 30 runs / 5 minutes / user.
  const userRl = await checkRateLimit(`agent:user:${userId}`, {
    windowMs: 5 * 60 * 1000,
    maxAttempts: 30,
    lockMs: 5 * 60 * 1000,
  });
  if (!userRl.allowed) {
    return jsonError(
      `Too many agent runs. Try again in ${userRl.retryAfterSec}s.`,
      429,
      { retryAfterSec: userRl.retryAfterSec }
    );
  }

  // Per-IP rate limit as a second layer (catches multi-account spam)
  const ip = getClientIp(req);
  const ipRl = await checkRateLimit(`agent:ip:${ip}`, {
    windowMs: 5 * 60 * 1000,
    maxAttempts: 60,
    lockMs: 5 * 60 * 1000,
  });
  if (!ipRl.allowed) {
    return jsonError(
      `Too many agent runs from this network. Try again in ${ipRl.retryAfterSec}s.`,
      429,
      { retryAfterSec: ipRl.retryAfterSec }
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const carrierDotNumber = body.carrierDotNumber ?? null;
  const persona = body.persona || "investigator";
  const kind = body.kind || "user_turn";

  // Find or create the AgentSession (one per user × carrier)
  const agentSession = await findOrCreateSession(userId, carrierDotNumber, persona, body.sessionId);
  if (!agentSession) return jsonError("Session not found", 404);

  // Hydrate prior conversation, trimmed to fit the token budget
  const priorMessages = await prisma.agentMessage.findMany({
    where: { sessionId: agentSession.id },
    orderBy: { createdAt: "asc" },
  });
  const messageContents = priorMessages.map((m) => m.content);
  const trim = trimConversationToFit(messageContents);
  const messages: Anthropic.MessageParam[] = trim.keptIndices.map((i) => {
    const m = priorMessages[i];
    let content: unknown;
    try {
      content = JSON.parse(m.content);
    } catch {
      content = m.content;
    }
    return { role: m.role as "user" | "assistant", content: content as Anthropic.MessageParam["content"] };
  });

  // Append the new turn
  let seedText: string | null = null;
  if (kind === "auto_brief" && carrierDotNumber) {
    seedText = `A user just opened carrier USDOT ${carrierDotNumber}. Run a fast intake sweep IN PARALLEL — call lookup_carrier, fetch_inspections, fetch_crashes, detect_chameleon_signals, compute_trust_score, and find_affiliations all in one assistant turn (multiple tool_use blocks). Then synthesize a verdict-first decision_card via present_artifact, citing the tool_use_ids. Then write a one-paragraph plain-language explanation. Finally suggest 2 follow-up questions.`;
  } else if (kind === "user_turn" && body.message) {
    seedText = body.message;
  } else if (kind === "persona_switch") {
    seedText = `(persona switched to ${persona})`;
  }

  if (seedText) {
    messages.push({ role: "user", content: seedText });
  }

  // Create the AgentRun
  const run = await prisma.agentRun.create({
    data: {
      sessionId: agentSession.id,
      kind,
      persona,
      status: "running",
      triggeredBy: "user",
    },
  });

  // Persist the user turn (if any) — link to this run
  if (seedText) {
    await prisma.agentMessage.create({
      data: {
        sessionId: agentSession.id,
        runId: run.id,
        role: "user",
        content: JSON.stringify(seedText),
      },
    });
  }

  const personaConfig = getPersona(persona);
  const tools = pickTools(personaConfig.tools);

  // Load long-term memory (carrier observations + user preferences) and
  // splice into the persona's system prompt for this run.
  const memory = await loadMemoryForRun(prisma, userId, carrierDotNumber);
  const fullSystemPrompt = personaConfig.system + memory.systemPromptAddendum;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = createSseSender(controller);
      const heartbeat = setInterval(() => send("ping", { t: Date.now() }), 15_000);
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", () => {
        prisma.agentRun.update({ where: { id: run.id }, data: { status: "aborted" } }).catch(() => {});
        finish();
      });

      send("run_start", { runId: run.id, sessionId: agentSession.id, persona });

      const emit = (e: AgentEvent) => {
        switch (e.type) {
          case "thinking":
            send("thinking", { text: e.text });
            break;
          case "tool_call_start":
            send("tool_call_start", { id: e.id, name: e.name, input: e.input });
            break;
          case "tool_call_end":
            send("tool_call_end", { id: e.id, ok: e.ok, summary: e.summary, durationMs: e.durationMs });
            break;
          case "turn_end":
            send("turn_end", { stopReason: e.stopReason, tokensIn: e.tokensIn, tokensOut: e.tokensOut });
            break;
          default:
            break;
        }
      };

      try {
        const result = await runAgent({
          ctx: {
            userId,
            carrierDotNumber,
            runId: run.id,
            sessionId: agentSession.id,
            prisma,
            emitArtifact: async ({ type, title, payload, citations }) => {
              const artifact = await prisma.artifact.create({
                data: {
                  sessionId: agentSession.id,
                  runId: run.id,
                  type,
                  title: title || null,
                  payload: JSON.stringify(payload),
                  citations: JSON.stringify(citations),
                },
              });
              send("artifact", { id: artifact.id, artifactType: type, title, payload });
              return { id: artifact.id };
            },
          },
          systemPrompt: fullSystemPrompt,
          tools,
          messages,
          emit,
          signal: req.signal,
        });

        // Persist the final assistant turn
        if (result.messages.length > messages.length) {
          // The runtime appended assistant + tool_result blocks; persist only the
          // FINAL assistant message (the one that ended the loop)
          for (let i = messages.length; i < result.messages.length; i++) {
            const msg = result.messages[i];
            await prisma.agentMessage.create({
              data: {
                sessionId: agentSession.id,
                runId: run.id,
                role: msg.role,
                content: JSON.stringify(msg.content),
              },
            });
          }
        }

        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: "complete",
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
            completedAt: new Date(),
          },
        });

        // NOTE: do NOT re-emit result.finalText as a "text" event — the user
        // already saw it streamed in via "thinking" deltas during the terminal
        // turn. Sending it again would duplicate the answer in the UI.
        send("done", { runId: run.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.agentRun
          .update({
            where: { id: run.id },
            data: { status: "error", error: message, completedAt: new Date() },
          })
          .catch(() => {});
        send("error", { message });
        send("done", { runId: run.id });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

async function findOrCreateSession(
  userId: string,
  carrierDotNumber: string | null,
  persona: string,
  explicitSessionId: string | undefined
) {
  if (explicitSessionId) {
    return prisma.agentSession.findFirst({
      where: { id: explicitSessionId, userId },
    });
  }

  // SQLite + Prisma: @@unique([userId, carrierDotNumber]) — but null in
  // composite uniques behaves differently per DB. Use findFirst then create.
  const existing = await prisma.agentSession.findFirst({
    where: { userId, carrierDotNumber },
  });
  if (existing) {
    if (existing.persona !== persona) {
      return prisma.agentSession.update({
        where: { id: existing.id },
        data: { persona },
      });
    }
    return existing;
  }
  return prisma.agentSession.create({
    data: { userId, carrierDotNumber, persona },
  });
}
