import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  context: { params: { rosterId: string; dotNumber: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  // Verify ownership
  const roster = await prisma.monitoredRoster.findFirst({
    where: { id: context.params.rosterId, userId: session.user.id },
  });
  if (!roster) {
    return jsonError("Roster not found", 404);
  }

  await prisma.rosterCarrier.deleteMany({
    where: {
      rosterId: context.params.rosterId,
      dotNumber: context.params.dotNumber,
    },
  });

  return new Response(null, { status: 204 });
}
