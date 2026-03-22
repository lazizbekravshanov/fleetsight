import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/** GET — Check current user's active reports for this carrier */
export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const dotNumber = context.params.dotNumber;
  if (!/^\d{1,10}$/.test(dotNumber)) {
    return jsonError("Invalid DOT number", 400);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const reports = await prisma.communityReport.findMany({
    where: {
      userId: session.user.id,
      dotNumber,
      status: "active",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      reportType: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    reports: reports.map((r) => ({
      id: r.id,
      reportType: r.reportType,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
