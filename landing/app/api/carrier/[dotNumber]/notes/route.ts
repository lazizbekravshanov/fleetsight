import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { z } from "zod";

/** GET /api/carrier/[dotNumber]/notes — list notes for a carrier */
export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const notes = await prisma.carrierNote.findMany({
    where: { userId: session.user.id, dotNumber: context.params.dotNumber },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ notes });
}

const createSchema = z.object({
  content: z.string().min(1).max(5000),
});

/** POST /api/carrier/[dotNumber]/notes — create a note */
export async function POST(
  req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 400);

  const note = await prisma.carrierNote.create({
    data: {
      userId: session.user.id,
      dotNumber: context.params.dotNumber,
      content: parsed.data.content,
    },
  });

  return Response.json({ note }, { status: 201 });
}
