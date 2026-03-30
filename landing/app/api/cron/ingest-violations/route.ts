import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestViolationsForCarrier } from "@/lib/inspections/ingestion";
import { cacheGet, cacheSet } from "@/lib/cache";

export const maxDuration = 300; // 5 minutes

const CHUNK_SIZE = 50;
const DELAY_MS = 300;

/** GET /api/cron/ingest-violations — nightly violation ingestion */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Gather unique DOT numbers from both sources ────────────────
  const [rosterDots, watchedDots] = await Promise.all([
    prisma.rosterCarrier.findMany({
      select: { dotNumber: true },
      distinct: ["dotNumber"],
    }),
    prisma.watchedCarrier.findMany({
      select: { dotNumber: true },
      distinct: ["dotNumber"],
    }),
  ]);

  const allDots = Array.from(
    new Set([
      ...rosterDots.map((r) => r.dotNumber),
      ...watchedDots.map((w) => w.dotNumber),
    ])
  ).sort();

  if (allDots.length === 0) {
    return Response.json({ processed: 0, ingested: 0, errors: 0, done: true });
  }

  // ── Cursor-based pagination for chunked processing ─────────────
  const cursorKey = "ingest-violations:cursor";
  const savedCursor = await cacheGet<number>(cursorKey);
  const startOffset = savedCursor ?? 0;

  const chunk = allDots.slice(startOffset, startOffset + CHUNK_SIZE);

  if (chunk.length === 0) {
    // All DOTs processed — reset cursor
    await cacheSet(cursorKey, 0, 86400);
    return Response.json({ processed: 0, ingested: 0, errors: 0, done: true });
  }

  let totalIngested = 0;
  let errorCount = 0;

  for (let i = 0; i < chunk.length; i++) {
    const dot = chunk[i];
    try {
      const result = await ingestViolationsForCarrier(parseInt(dot, 10));
      totalIngested += result.ingested;
    } catch {
      errorCount++;
    }

    // Rate-limit delay between calls (skip after last item)
    if (i < chunk.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // ── Advance cursor ─────────────────────────────────────────────
  const nextOffset =
    startOffset + chunk.length >= allDots.length
      ? 0
      : startOffset + chunk.length;
  await cacheSet(cursorKey, nextOffset, 86400);

  const done = nextOffset === 0;

  return Response.json({
    processed: chunk.length,
    ingested: totalIngested,
    errors: errorCount,
    done,
  });
}
