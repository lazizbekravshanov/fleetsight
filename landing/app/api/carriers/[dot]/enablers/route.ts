import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getCarrierEnablers } from "@/lib/enablers/scoring";

const paramSchema = z.object({
  dot: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dot: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  try {
    const result = await getCarrierEnablers(parsed.data.dot);
    return Response.json(result);
  } catch (err) {
    console.error("Carrier enablers error:", err);
    return jsonError("Failed to load enabler data", 500);
  }
}
