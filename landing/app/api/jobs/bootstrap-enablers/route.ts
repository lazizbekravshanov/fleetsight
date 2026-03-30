import { NextRequest } from "next/server";
import { importFromCarrierAgents } from "@/lib/enablers/ingestion";
import { computeEnablerScore } from "@/lib/enablers/scoring";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300; // 5 minutes

/**
 * POST /api/jobs/bootstrap-enablers
 * Bootstraps the enabler network from existing CarrierAgent records,
 * then scores all enablers. Callable via CRON_SECRET or authenticated session.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Step 1: Import enablers from existing CarrierAgent data
  const importResult = await importFromCarrierAgents();

  // Step 2: Score all enablers that have carrier links
  const enablers = await prisma.enabler.findMany({
    where: { carrierLinks: { some: {} } },
    select: { id: true },
  });

  let scored = 0;
  let scoreErrors = 0;

  for (const enabler of enablers) {
    try {
      await computeEnablerScore(enabler.id);
      scored++;
    } catch {
      scoreErrors++;
    }
  }

  return Response.json({
    import: importResult,
    scoring: { total: enablers.length, scored, errors: scoreErrors },
  });
}
