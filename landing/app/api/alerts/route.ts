import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ alerts: [], total: 0, unreadCount: 0 });
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const offset = (page - 1) * limit;

  const where = {
    userId: session.user.id,
    ...(unreadOnly ? { readAt: null } : {}),
  };

  const [alerts, total, unreadCount] = await Promise.all([
    prisma.monitoringAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.monitoringAlert.count({ where }),
    prisma.monitoringAlert.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);

  return Response.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      dotNumber: a.dotNumber,
      legalName: a.legalName,
      alertType: a.alertType,
      severity: a.severity,
      title: a.title,
      detail: a.detail,
      previousValue: a.previousValue,
      newValue: a.newValue,
      read: a.readAt !== null,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
    unreadCount,
    page,
    pages: Math.ceil(total / limit),
  });
}
