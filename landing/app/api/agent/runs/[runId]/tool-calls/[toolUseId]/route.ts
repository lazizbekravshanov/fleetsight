/**
 * GET /api/agent/runs/[runId]/tool-calls/[toolUseId]
 *
 * Lazy fetch the full input/output payload of a tool call. The SSE stream
 * only sends the summary (≤200 char) to keep wire weight low; the UI loads
 * the raw JSON on demand when the user expands a tool feed entry.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { runId: string; toolUseId: string } }
) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id as string | undefined;
  if (!userId) return jsonError("Unauthorized", 401);

  const toolCall = await prisma.toolCall.findUnique({
    where: { runId_toolUseId: { runId: params.runId, toolUseId: params.toolUseId } },
    include: { run: { include: { session: { select: { userId: true } } } } },
  });

  if (!toolCall) return jsonError("Tool call not found", 404);
  if (toolCall.run.session.userId !== userId) return jsonError("Forbidden", 403);

  let input: unknown = null;
  let output: unknown = null;
  try {
    input = JSON.parse(toolCall.input);
  } catch {
    input = toolCall.input;
  }
  try {
    output = toolCall.output ? JSON.parse(toolCall.output) : null;
  } catch {
    output = toolCall.output;
  }

  return NextResponse.json({
    id: toolCall.id,
    name: toolCall.name,
    summary: toolCall.summary,
    ok: toolCall.ok,
    durationMs: toolCall.durationMs,
    input,
    output,
    createdAt: toolCall.createdAt.toISOString(),
  });
}
