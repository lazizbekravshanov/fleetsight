import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getInsuranceByDot, getAuthorityHistoryByDot } from "@/lib/socrata";

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

  const [insurance, authorityHistory] = await Promise.all([
    getInsuranceByDot(dotNumber).catch(() => []),
    getAuthorityHistoryByDot(dotNumber).catch(() => []),
  ]);

  return Response.json({ insurance, authorityHistory });
}
