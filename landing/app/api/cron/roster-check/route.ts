import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCarrierHealth, createAlert, deriveHealthStatus, buildMonitoringEmail } from "@/lib/monitoring";
import { Resend } from "resend";
import { cacheGet, cacheSet } from "@/lib/cache";

export const maxDuration = 300; // 5 minutes

/** GET /api/cron/roster-check — called by Vercel Cron every 6 hours */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get cursor from Redis for chunked processing
  const CHUNK_SIZE = 1800;
  const cursorKey = "roster-check:cursor";
  const savedCursor = await cacheGet<number>(cursorKey);
  const startOffset = savedCursor ?? 0;

  // Get all roster carriers that need checking, with user info
  const carriers = await prisma.rosterCarrier.findMany({
    include: {
      roster: {
        include: {
          user: { select: { id: true, email: true } },
        },
      },
    },
    orderBy: { id: "asc" },
    skip: startOffset,
    take: CHUNK_SIZE,
  });

  if (carriers.length === 0) {
    // Reset cursor — we've processed all
    await cacheSet(cursorKey, 0, 86400);
    return Response.json({ checked: 0, alerts: 0, done: true });
  }

  let alertCount = 0;
  const userAlerts = new Map<
    string,
    { email: string; alerts: { legalName: string; dotNumber: string; title: string; severity: string }[] }
  >();

  for (const carrier of carriers) {
    try {
      const health = await checkCarrierHealth(carrier.dotNumber);
      const newStatus = health.healthStatus;
      const oldStatus = carrier.healthStatus;

      // Update carrier health
      await prisma.rosterCarrier.update({
        where: { id: carrier.id },
        data: {
          healthStatus: newStatus,
          lastCheckedAt: new Date(),
        },
      });

      // Detect degradation (status got worse)
      const statusOrder = { green: 0, yellow: 1, red: 2, unknown: -1 };
      const oldVal = statusOrder[oldStatus as keyof typeof statusOrder] ?? -1;
      const newVal = statusOrder[newStatus as keyof typeof statusOrder] ?? -1;

      if (newVal > oldVal && oldVal >= 0) {
        const userId = carrier.roster.userId;
        const title =
          newStatus === "red"
            ? `${carrier.legalName} is now RED — immediate attention needed`
            : `${carrier.legalName} degraded from ${oldStatus} to ${newStatus}`;

        const alertType =
          health.usdotStatus === "OUT-OF-SERVICE"
            ? "oos_order"
            : health.operatingAuthority === "NONE ACTIVE"
              ? "authority_revoked"
              : "status_change";

        const severity =
          newStatus === "red" ? "critical" : "high";

        await createAlert({
          userId,
          dotNumber: carrier.dotNumber,
          legalName: carrier.legalName,
          alertType,
          severity,
          title,
          detail: `Health status changed: ${oldStatus} → ${newStatus}. USDOT: ${health.usdotStatus ?? "unknown"}, Authority: ${health.operatingAuthority ?? "unknown"}`,
          previousValue: oldStatus,
          newValue: newStatus,
        });

        alertCount++;

        // Collect for email digest
        const ua = userAlerts.get(userId) ?? {
          email: carrier.roster.user.email,
          alerts: [],
        };
        ua.alerts.push({
          legalName: carrier.legalName,
          dotNumber: carrier.dotNumber,
          title,
          severity,
        });
        userAlerts.set(userId, ua);
      }

      // Rate limit: 200ms delay between carriers
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch {
      // Skip failed carriers
    }
  }

  // Save cursor for next chunk
  const nextOffset = carriers.length < CHUNK_SIZE ? 0 : startOffset + carriers.length;
  await cacheSet(cursorKey, nextOffset, 86400);

  // Send email digests
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "alerts@fleetsight.io";
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const [, { email, alerts }] of userAlerts) {
    if (!resend || !email) continue;
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `FleetSight: ${alerts.length} fleet alert${alerts.length > 1 ? "s" : ""} detected`,
        html: buildMonitoringEmail(alerts),
      });
    } catch {
      // Email failure is non-fatal
    }
  }

  return Response.json({
    checked: carriers.length,
    alerts: alertCount,
    done: carriers.length < CHUNK_SIZE,
  });
}
