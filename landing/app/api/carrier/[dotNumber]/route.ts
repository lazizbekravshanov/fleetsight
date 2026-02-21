import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getCarrierByDot, getInspectionsByDot, getCrashesByDot } from "@/lib/socrata";
import { getCarrierBasics } from "@/lib/fmcsa";

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

  const [carrier, inspections, crashes] = await Promise.all([
    getCarrierByDot(dotNumber),
    getInspectionsByDot(dotNumber),
    getCrashesByDot(dotNumber),
  ]);

  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  // Optional BASIC measures — non-fatal if key is missing
  let basics: unknown = null;
  try {
    basics = await getCarrierBasics(String(dotNumber));
  } catch {
    // FMCSA_WEBKEY may not be configured — skip silently
  }

  return Response.json({
    carrier,
    inspections,
    crashes,
    basics,
  });
}
