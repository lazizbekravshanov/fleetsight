import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  context: { params: { alertId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const alert = await prisma.monitoringAlert.findFirst({
    where: { id: context.params.alertId, userId: session.user.id },
  });
  if (!alert) {
    return jsonError("Alert not found", 404);
  }

  const updated = await prisma.monitoringAlert.update({
    where: { id: alert.id },
    data: { readAt: new Date() },
  });

  return Response.json({ id: updated.id, read: true });
}
