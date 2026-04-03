import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: { rosterId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ roster: null });
  }

  const roster = await prisma.monitoredRoster.findFirst({
    where: { id: context.params.rosterId, userId: session.user.id },
    include: {
      carriers: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!roster) {
    return jsonError("Roster not found", 404);
  }

  return Response.json({
    id: roster.id,
    name: roster.name,
    carriers: roster.carriers.map((c) => ({
      dotNumber: c.dotNumber,
      legalName: c.legalName,
      healthStatus: c.healthStatus,
      lastGrade: c.lastGrade,
      lastScore: c.lastScore,
      lastCheckedAt: c.lastCheckedAt?.toISOString() ?? null,
    })),
  });
}
