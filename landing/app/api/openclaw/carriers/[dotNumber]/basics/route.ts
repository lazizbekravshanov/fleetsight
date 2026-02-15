import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApiToken } from "@/lib/api-token";
import { FmcsaHttpError, getCarrierBasics } from "@/lib/fmcsa";
import { jsonError } from "@/lib/http";

const paramsSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/)
});

export async function GET(req: NextRequest, context: { params: { dotNumber: string } }) {
  const token = await authenticateApiToken(req.headers.get("authorization"));
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = paramsSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT", 400);
  }

  if (!token.scope.includes("carrier:read")) {
    return jsonError("Token scope does not allow carrier reads", 403);
  }

  if (token.user.profile && token.user.profile.usdotNumber !== parsed.data.dotNumber) {
    return jsonError("Token does not grant access to this USDOT", 403);
  }

  try {
    const basics = await getCarrierBasics(parsed.data.dotNumber);
    return Response.json({ ok: true, basics });
  } catch (error) {
    if (error instanceof FmcsaHttpError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to query carrier BASIC measures", 502);
  }
}
