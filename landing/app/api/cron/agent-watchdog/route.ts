/**
 * /api/cron/agent-watchdog — autonomous overnight agent runs.
 *
 * Walks the watched carriers list and runs the Watchdog persona against each
 * one, recording deltas as MonitoringAlert rows for the watching user.
 *
 * Currently runs serially with a per-invocation cap to stay under Vercel's
 * function timeout. When we move to Postgres + larger fleets, this will fan
 * out via QStash (Phase 11 plan note).
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import { pickTools } from "@/lib/agent/tools";
import { getPersona } from "@/lib/agent/personas";
import { loadMemoryForRun } from "@/lib/agent/memory";
import type { AgentEvent } from "@/lib/agent/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_CARRIERS_PER_RUN = 25;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Stale-first ordering: investigate the carriers that have been observed
  // least recently. This is a rough proxy for "least recently watchdog'd".
  const watched = await prisma.watchedCarrier.findMany({
    orderBy: { addedAt: "asc" },
    take: MAX_CARRIERS_PER_RUN,
  });

  let processed = 0;
  let alerts = 0;
  const errors: Array<{ dot: string; error: string }> = [];

  for (const wc of watched) {
    try {
      const result = await runWatchdogForCarrier(wc.userId, wc.dotNumber, wc.legalName);
      processed++;
      alerts += result.alertsCreated;
    } catch (err) {
      errors.push({ dot: wc.dotNumber, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return Response.json({ processed, alerts, errors });
}

interface WatchdogResult {
  alertsCreated: number;
}

async function runWatchdogForCarrier(
  userId: string,
  dotNumber: string,
  legalName: string
): Promise<WatchdogResult> {
  // Find or create the AgentSession for this (user, carrier)
  let session = await prisma.agentSession.findFirst({
    where: { userId, carrierDotNumber: dotNumber },
  });
  if (!session) {
    session = await prisma.agentSession.create({
      data: { userId, carrierDotNumber: dotNumber, persona: "watchdog" },
    });
  }

  const run = await prisma.agentRun.create({
    data: {
      sessionId: session.id,
      kind: "watchdog",
      persona: "watchdog",
      status: "running",
      triggeredBy: "cron",
    },
  });

  const personaConfig = getPersona("watchdog");
  const tools = pickTools(personaConfig.tools);
  const memory = await loadMemoryForRun(prisma, userId, dotNumber);
  const fullSystemPrompt = personaConfig.system + memory.systemPromptAddendum;

  const seedMessage = `Scheduled overnight watchdog run for carrier USDOT ${dotNumber} (${legalName}). Compare the current state against the persistent observations in your system prompt. If something materially changed (new inspections, crashes, authority change, insurance lapse, new chameleon signal), emit a decision_card AND call add_observation to record the new state for the next run. If nothing changed, emit a single short memo "No material change since last run" and stop.`;

  let alertsCreated = 0;

  try {
    await runAgent({
      ctx: {
        userId,
        carrierDotNumber: dotNumber,
        runId: run.id,
        sessionId: session.id,
        prisma,
        emitArtifact: async ({ type, title, payload, citations }) => {
          const artifact = await prisma.artifact.create({
            data: {
              sessionId: session.id,
              runId: run.id,
              type,
              title: title || null,
              payload: JSON.stringify(payload),
              citations: JSON.stringify(citations),
            },
          });

          // Materialize a MonitoringAlert when the agent emits a decision_card
          // with a non-pass verdict — this is what the watching user sees.
          if (type === "decision_card") {
            const dc = payload as { verdict?: string; headline?: string; bullets?: string[] };
            if (dc.verdict && dc.verdict !== "pass") {
              await prisma.monitoringAlert.create({
                data: {
                  userId,
                  dotNumber,
                  legalName,
                  alertType: "watchdog",
                  severity: dc.verdict === "fail" ? "high" : "medium",
                  title: dc.headline?.slice(0, 200) || "Watchdog finding",
                  detail: (dc.bullets || []).slice(0, 5).join(" • "),
                },
              });
              alertsCreated++;
            }
          }

          return { id: artifact.id };
        },
      },
      systemPrompt: fullSystemPrompt,
      tools,
      messages: [{ role: "user", content: seedMessage }],
      emit: noopEmit,
      maxTurns: 6, // tighter cap for cron — don't burn tokens
    });

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "complete", completedAt: new Date() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "error", error: message, completedAt: new Date() },
    });
    throw err;
  }

  return { alertsCreated };
}

function noopEmit(_e: AgentEvent): void {
  // Watchdog is headless — no SSE consumer
}
