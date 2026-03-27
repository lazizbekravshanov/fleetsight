import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { generateDriverScorecard } from "@/lib/inspections/driver-scorecard";

const paramSchema = z.object({
  cdlKey: z.string().min(1).max(50),
});

const querySchema = z.object({
  dot: z.string().regex(/^\d{1,10}$/).optional(),
  months: z.coerce.number().int().min(1).max(60).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: { cdlKey: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid CDL key", 400);
  }

  const { searchParams } = new URL(req.url);
  const qp = querySchema.safeParse({
    dot: searchParams.get("dot") ?? undefined,
    months: searchParams.get("months") ?? undefined,
  });

  const dotNumber = qp.success && qp.data.dot ? parseInt(qp.data.dot, 10) : undefined;
  const months = qp.success ? qp.data.months : undefined;

  try {
    const scorecard = await generateDriverScorecard(
      decodeURIComponent(parsed.data.cdlKey),
      dotNumber,
      months
    );
    return Response.json(scorecard);
  } catch (err) {
    console.error("Driver scorecard error:", err);
    return jsonError("Failed to generate driver scorecard", 500);
  }
}
