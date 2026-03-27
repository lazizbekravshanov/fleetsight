import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { runDetectionPipeline, populateVehiclesFromInspections } from "@/lib/affiliation-detection";

export const maxDuration = 300; // 5 minutes

/**
 * POST /api/jobs/detect-affiliations
 * Triggers the full affiliation detection pipeline:
 *   1. Optionally populate VINs from inspections
 *   2. Self-join to find shared VINs
 *   3. Union-Find clustering
 *   4. Pairwise scoring with temporal analysis
 *   5. Persist clusters, edges, and per-VIN details
 */
export async function POST(req: NextRequest) {
  // Auth: either CRON_SECRET or authenticated user
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!isCron) {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }
  }

  const body = await req.json().catch(() => ({}));
  const populateFromInspections = body.populateFromInspections === true;

  let populated = 0;
  if (populateFromInspections) {
    populated = await populateVehiclesFromInspections();
  }

  const result = await runDetectionPipeline();

  return Response.json({
    ok: true,
    populated,
    ...result,
  });
}
