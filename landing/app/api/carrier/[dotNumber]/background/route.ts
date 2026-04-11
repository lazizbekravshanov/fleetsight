import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getServerAuthSession } from "@/auth";
import { getCarrierByDot } from "@/lib/socrata";
import { runBackgroundChecks } from "@/lib/background";
import { generateRiskNarrative } from "@/lib/ai/risk-narrative";

// runBackgroundChecks makes several Socrata calls and generateRiskNarrative
// calls Anthropic. 30s keeps us comfortably above the typical ~10-15s tail.
export const runtime = "nodejs";
export const maxDuration = 30;

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

  // Anthropic enrichment is gated to authenticated users only — prevents
  // unauthenticated callers from burning the API budget.
  const session = await getServerAuthSession();
  const riskNarrative = session?.user?.id
    ? await generateRiskNarrative(carrier.legal_name, data).catch(() => null)
    : null;

  return Response.json({ ...data, riskNarrative });
}
