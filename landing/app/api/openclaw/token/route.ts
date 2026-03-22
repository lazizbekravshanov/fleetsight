import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/auth";
import { generateScopedToken } from "@/lib/api-token";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  scope: z.string().min(1).max(120).default("carrier:read"),
  ttlDays: z.number().int().min(1).max(90).default(30),
  tier: z.enum(["free", "starter", "professional", "enterprise"]).optional(),
});

export async function POST(req: NextRequest) {
  if (!enforceSameOrigin(req)) {
    return jsonError("Invalid origin", 403);
  }

  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { profile: { select: { usdotNumber: true } } }
  });
  const payload = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid token request", 400);
  }

  // risk:read scope does NOT require USDOT (can query any carrier)
  const scopes = parsed.data.scope.split(",").map((s: string) => s.trim());
  const needsUsdot = scopes.some((s: string) => s !== "risk:read");
  if (needsUsdot && !user?.profile?.usdotNumber) {
    return jsonError("Complete onboarding before generating OpenClaw tokens", 403);
  }

  const { token, tokenHash } = generateScopedToken({
    userId: session.user.id,
    scope: parsed.data.scope
  });
  const expiresAt = new Date(Date.now() + parsed.data.ttlDays * 24 * 60 * 60 * 1000);

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      tokenHash,
      scope: parsed.data.scope,
      tier: parsed.data.tier ?? "free",
      expiresAt
    }
  });

  return Response.json({
    ok: true,
    token,
    scope: parsed.data.scope,
    expiresAt: expiresAt.toISOString(),
    issuer: process.env.OPENCLAW_ISSUER_ID || "local-openclaw"
  });
}
