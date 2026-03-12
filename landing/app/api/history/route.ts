import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { z } from "zod";

/** GET /api/history — last 15 unique carriers searched */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const rows = await prisma.searchHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { searchedAt: "desc" },
    take: 15,
  });

  return Response.json({ history: rows });
}

const recordSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/),
  legalName: z.string().min(1).max(200),
});

/** POST /api/history — record a carrier lookup (upsert by dotNumber, refresh timestamp) */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 400);

  const { dotNumber, legalName } = parsed.data;

  // Delete existing entry for this DOT so we insert fresh (preserves recency ordering)
  await prisma.searchHistory.deleteMany({
    where: { userId: session.user.id, dotNumber },
  });

  await prisma.searchHistory.create({
    data: { userId: session.user.id, dotNumber, legalName },
  });

  return new Response(null, { status: 204 });
}
