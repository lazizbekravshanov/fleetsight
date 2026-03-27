import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { generateCostImpact } from "@/lib/inspections/cost-model";

const paramSchema = z.object({
  dot: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).optional(),
  avgTowCost: z.coerce.number().min(0).optional(),
  avgRepairCost: z.coerce.number().min(0).optional(),
  avgDelayHours: z.coerce.number().min(0).optional(),
  revenuePerMile: z.coerce.number().min(0).optional(),
  avgDailyMiles: z.coerce.number().min(0).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: { dot: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const { searchParams } = new URL(req.url);
  const qp = querySchema.safeParse({
    months: searchParams.get("months") ?? undefined,
    avgTowCost: searchParams.get("avgTowCost") ?? undefined,
    avgRepairCost: searchParams.get("avgRepairCost") ?? undefined,
    avgDelayHours: searchParams.get("avgDelayHours") ?? undefined,
    revenuePerMile: searchParams.get("revenuePerMile") ?? undefined,
    avgDailyMiles: searchParams.get("avgDailyMiles") ?? undefined,
  });

  const dotNumber = parseInt(parsed.data.dot, 10);
  const customInputs = qp.success
    ? {
        avgTowCost: qp.data.avgTowCost,
        avgRepairCost: qp.data.avgRepairCost,
        avgDelayHours: qp.data.avgDelayHours,
        revenuePerMile: qp.data.revenuePerMile,
        avgDailyMiles: qp.data.avgDailyMiles,
      }
    : undefined;

  try {
    const report = await generateCostImpact(dotNumber, customInputs, qp.success ? qp.data.months : undefined);
    return Response.json(report);
  } catch (err) {
    console.error("Cost impact error:", err);
    return jsonError("Failed to generate cost impact report", 500);
  }
}
