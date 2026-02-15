import { NextRequest } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, getClientIp, jsonError } from "@/lib/http";

const bodySchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

export async function POST(req: NextRequest) {
  if (!enforceSameOrigin(req)) {
    return jsonError("Invalid origin", 403);
  }

  const payload = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError("Invalid signup payload", 400, {
      issues: parsed.error.flatten()
    });
  }

  const ip = getClientIp(req);
  const key = `signup:${parsed.data.email}:${ip}`;
  const gate = checkRateLimit(key, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5,
    lockMs: 15 * 60 * 1000
  });

  if (!gate.allowed) {
    return jsonError("Too many signup attempts. Try again later.", 429, {
      retryAfterSec: gate.retryAfterSec,
      lockedUntil: new Date(gate.lockedUntilMs).toISOString()
    });
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true }
  });
  if (existing) {
    return jsonError("Email is already registered", 409);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash
    },
    select: { id: true, email: true }
  });

  return Response.json({ ok: true, user }, { status: 201 });
}
