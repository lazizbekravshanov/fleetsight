import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getCarrierByDot } from "@/lib/socrata";
import { runBackgroundChecks } from "@/lib/background";
import { generateRiskNarrative } from "@/lib/ai/risk-narrative";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);
  const carrier = await getCarrierByDot(dotNumber);
  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  const data = await runBackgroundChecks(carrier);

  // AI risk narrative is free for all users
  const riskNarrative = await generateRiskNarrative(
    carrier.legal_name,
    data
  ).catch(() => null);

  return Response.json({ ...data, riskNarrative });
}
