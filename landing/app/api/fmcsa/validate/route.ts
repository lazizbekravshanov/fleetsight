import { NextRequest } from "next/server";
import { z } from "zod";
import { extractCarrierRecord, FmcsaHttpError, getCarrierProfile } from "@/lib/fmcsa";
import { enforceSameOrigin, jsonError } from "@/lib/http";

const bodySchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/)
});

export async function POST(req: NextRequest) {
  if (!enforceSameOrigin(req)) {
    return jsonError("Invalid origin", 403);
  }

  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid USDOT payload", 400);
  }

  try {
    const profile = await getCarrierProfile(parsed.data.dotNumber);
    const carrier = extractCarrierRecord(profile);
    if (!carrier) {
      return jsonError("USDOT record not found", 404);
    }
    return Response.json({ ok: true, carrier, profile });
  } catch (error) {
    if (error instanceof FmcsaHttpError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to validate USDOT", 502);
  }
}
