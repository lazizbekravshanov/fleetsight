import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { z } from "zod";

/** GET /api/watchlist?dot=1234567 → {watched: boolean}
 *  GET /api/watchlist              → {carriers: WatchedCarrier[]} */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const dot = req.nextUrl.searchParams.get("dot");

  if (dot) {
    const row = await prisma.watchedCarrier.findUnique({
      where: { userId_dotNumber: { userId: session.user.id, dotNumber: dot } },
      select: { id: true, statusChanged: true },
    });
    return Response.json({ watched: !!row, statusChanged: row?.statusChanged ?? false });
  }

  const carriers = await prisma.watchedCarrier.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
  });

  return Response.json({ carriers });
}

const addSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/),
  legalName: z.string().min(1).max(200),
  usdotStatus: z.string().nullable().optional(),
  authStatus: z.string().nullable().optional(),
});

/** POST /api/watchlist — add carrier to watchlist */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 400);

  const { dotNumber, legalName, usdotStatus, authStatus } = parsed.data;

  const carrier = await prisma.watchedCarrier.upsert({
    where: { userId_dotNumber: { userId: session.user.id, dotNumber } },
    update: {
      legalName,
      lastUsdotStatus: usdotStatus ?? null,
      lastAuthStatus: authStatus ?? null,
      lastCheckedAt: new Date(),
      statusChanged: false,
    },
    create: {
      userId: session.user.id,
      dotNumber,
      legalName,
      lastUsdotStatus: usdotStatus ?? null,
      lastAuthStatus: authStatus ?? null,
      lastCheckedAt: new Date(),
    },
  });

  return Response.json({ carrier }, { status: 201 });
}
