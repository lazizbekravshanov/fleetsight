import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  email: z.string().email().toLowerCase()
});

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") || "";
  const parsed = querySchema.safeParse({ email });
  if (!parsed.success) {
    return jsonError("Invalid email", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { lockoutUntil: true }
  });
  const locked = Boolean(user?.lockoutUntil && user.lockoutUntil > new Date());
  return Response.json({
    locked,
    lockedUntil: locked ? user?.lockoutUntil?.toISOString() ?? null : null
  });
}
