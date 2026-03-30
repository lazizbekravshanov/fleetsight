import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial state
      try {
        const [alerts, unreadCount] = await Promise.all([
          prisma.monitoringAlert.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
          prisma.monitoringAlert.count({
            where: { userId, readAt: null },
          }),
        ]);

        send("init", {
          alerts: alerts.map((a) => ({
            id: a.id,
            dotNumber: a.dotNumber,
            legalName: a.legalName,
            alertType: a.alertType,
            severity: a.severity,
            title: a.title,
            detail: a.detail,
            read: !!a.readAt,
            createdAt: a.createdAt.toISOString(),
          })),
          unreadCount,
        });
      } catch {
        send("error", { message: "Failed to load alerts" });
      }

      // Poll for new alerts every 15 seconds
      let lastCheck = new Date();
      const interval = setInterval(async () => {
        try {
          const newAlerts = await prisma.monitoringAlert.findMany({
            where: {
              userId,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "desc" },
          });

          if (newAlerts.length > 0) {
            const unreadCount = await prisma.monitoringAlert.count({
              where: { userId, readAt: null },
            });

            for (const a of newAlerts) {
              send("alert", {
                id: a.id,
                dotNumber: a.dotNumber,
                legalName: a.legalName,
                alertType: a.alertType,
                severity: a.severity,
                title: a.title,
                detail: a.detail,
                read: false,
                createdAt: a.createdAt.toISOString(),
              });
            }
            send("unread", { count: unreadCount });
          }

          lastCheck = new Date();
        } catch {
          // ignore polling errors
        }
      }, 15_000);

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          send("ping", { t: Date.now() });
        } catch {
          clearInterval(interval);
          clearInterval(heartbeat);
        }
      }, 30_000);

      // Cleanup on abort
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
