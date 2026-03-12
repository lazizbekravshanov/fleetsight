import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { z } from "zod";

/** PATCH /api/carrier/[dotNumber]/notes/[noteId] — update a note */
export async function PATCH(
  req: NextRequest,
  context: { params: { dotNumber: string; noteId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const parsed = z.object({ content: z.string().min(1).max(5000) }).safeParse(body);
  if (!parsed.success) return jsonError("Invalid request", 400);

  // Ensure note belongs to this user
  const existing = await prisma.carrierNote.findFirst({
    where: { id: context.params.noteId, userId: session.user.id },
  });
  if (!existing) return jsonError("Not found", 404);

  const note = await prisma.carrierNote.update({
    where: { id: context.params.noteId },
    data: { content: parsed.data.content },
  });

  return Response.json({ note });
}

/** DELETE /api/carrier/[dotNumber]/notes/[noteId] — delete a note */
export async function DELETE(
  _req: NextRequest,
  context: { params: { dotNumber: string; noteId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const existing = await prisma.carrierNote.findFirst({
    where: { id: context.params.noteId, userId: session.user.id },
  });
  if (!existing) return jsonError("Not found", 404);

  await prisma.carrierNote.delete({ where: { id: context.params.noteId } });
  return new Response(null, { status: 204 });
}
