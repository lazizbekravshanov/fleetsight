import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMonitoringEmail } from "@/lib/monitoring";
import { checkInspectionAlerts } from "@/lib/alerts/inspection-alerts";
import { checkEnablerAlerts } from "@/lib/alerts/enabler-alerts";
import { Resend } from "resend";

export const maxDuration = 300; // 5 minutes

/** GET /api/cron/check-alerts — daily alert generation + email digest */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // ── Run alert checkers ─────────────────────────────────────────
  const [inspectionAlerts, enablerAlerts] = await Promise.all([
    checkInspectionAlerts(),
    checkEnablerAlerts(),
  ]);

  const totalAlerts = inspectionAlerts + enablerAlerts;

  // ── Send email digests ─────────────────────────────────────────
  let emailsSent = 0;

  if (totalAlerts > 0) {
    // Find alerts created in the last 5 minutes (the ones we just generated)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentAlerts = await prisma.monitoringAlert.findMany({
      where: {
        createdAt: { gte: fiveMinutesAgo },
        readAt: null,
      },
      select: {
        userId: true,
        dotNumber: true,
        legalName: true,
        title: true,
        severity: true,
      },
    });

    // Group alerts by userId
    const userAlertMap = new Map<
      string,
      { legalName: string; dotNumber: string; title: string; severity: string }[]
    >();

    for (const alert of recentAlerts) {
      const existing = userAlertMap.get(alert.userId) ?? [];
      existing.push({
        legalName: alert.legalName,
        dotNumber: alert.dotNumber,
        title: alert.title,
        severity: alert.severity,
      });
      userAlertMap.set(alert.userId, existing);
    }

    // Look up user emails and send digests
    const resend = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "alerts@fleetsight.io";

    for (const [userId, alerts] of userAlertMap) {
      if (!resend) break;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user?.email) continue;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: `FleetSight: ${alerts.length} alert${alerts.length > 1 ? "s" : ""} detected`,
          html: buildMonitoringEmail(alerts),
        });
        emailsSent++;
      } catch {
        // Email failure is non-fatal
      }
    }
  }

  return Response.json({
    inspectionAlerts,
    enablerAlerts,
    emailsSent,
  });
}
