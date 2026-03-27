import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getEnforcementHeatmap } from "@/lib/enforcement/heatmap";

const querySchema = z.object({
  state: z.string().length(2).optional(),
  months: z.coerce.number().int().min(1).max(60).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qp = querySchema.safeParse({
    state: searchParams.get("state") ?? undefined,
    months: searchParams.get("months") ?? undefined,
  });

  const state = qp.success ? qp.data.state?.toUpperCase() : undefined;
  const months = qp.success ? qp.data.months : undefined;

  try {
    const data = await getEnforcementHeatmap({ state, months });
    return Response.json(data);
  } catch (err) {
    console.error("Enforcement heatmap error:", err);
    return jsonError("Failed to generate heatmap data", 500);
  }
}
