import { getServerAuthSession } from "@/auth";
import { ensureDbInitialized } from "@/lib/db-init";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";

export async function GET() {
  await ensureDbInitialized();
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true }
  });

  if (!user) {
    return jsonError("User not found", 404);
  }

  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt
    },
    profile: user.profile
  });
}
