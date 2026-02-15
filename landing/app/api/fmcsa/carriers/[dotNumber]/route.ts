import { NextRequest } from "next/server";
import { z } from "zod";
import { FmcsaHttpError, getCarrierProfile } from "@/lib/fmcsa";
import { jsonError } from "@/lib/http";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric")
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  try {
    const profile = await getCarrierProfile(parsed.data.dotNumber);
    return Response.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof FmcsaHttpError) {
      const status = [401, 404, 500].includes(error.status) ? error.status : 502;
      return jsonError(error.message, status);
    }
    return jsonError("Unable to fetch FMCSA carrier profile", 502);
  }
}
