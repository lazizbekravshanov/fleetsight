import { NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp, jsonError } from "@/lib/http";
import { getRateLimitState } from "@/lib/rate-limit";

const querySchema = z.object({
  email: z.string().email().toLowerCase()
});

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") || "";
  const parsed = querySchema.safeParse({ email });
  if (!parsed.success) {
    return jsonError("Invalid email", 400);
  }

  const ip = getClientIp(req);
  const state = getRateLimitState(`login:${parsed.data.email}:${ip}`);
  return Response.json({
    locked: Boolean(state.lockedUntilMs),
    lockedUntil: state.lockedUntilMs ? new Date(state.lockedUntilMs).toISOString() : null
  });
}
