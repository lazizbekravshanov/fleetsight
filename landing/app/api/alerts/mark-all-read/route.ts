import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ ok: true, count: 0 });
  }

  const result = await prisma.monitoringAlert.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return Response.json({ marked: result.count });
}
