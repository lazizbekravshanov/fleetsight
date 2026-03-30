import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/cron/send-reports — weekly scheduled compliance report
// Called by Vercel Cron or external scheduler
export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all users with active subscriptions and watched carriers
  const subscribers = await prisma.subscription.findMany({
    where: { status: "active" },
    include: {
      user: {
        include: {
          watchedCarriers: true,
          profile: true,
        },
      },
    },
  });

  let sent = 0;

  for (const sub of subscribers) {
    if (!sub.user.watchedCarriers.length || !sub.user.email) continue;

    const dotNumbers = sub.user.watchedCarriers.map((w) => w.dotNumber);

    // Generate compliance summary for each carrier
    const summaries = await Promise.all(
      dotNumbers.slice(0, 20).map(async (dot) => {
        const [risk, trust, alertCount] = await Promise.all([
          prisma.carrierRiskScore.findUnique({ where: { dotNumber: parseInt(dot) } }),
          prisma.carrierTrustScore.findUnique({ where: { dotNumber: parseInt(dot) } }),
          prisma.monitoringAlert.count({
            where: {
              userId: sub.userId,
              dotNumber: dot,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

        const watched = sub.user.watchedCarriers.find((w) => w.dotNumber === dot);
        return {
          dotNumber: dot,
          legalName: watched?.legalName ?? `USDOT ${dot}`,
          riskComposite: risk?.compositeScore ?? null,
          trustGrade: trust?.grade ?? null,
          trustScore: trust?.overallScore ?? null,
          alertsThisWeek: alertCount,
          statusChanged: watched?.statusChanged ?? false,
        };
      })
    );

    // In production, this would send an email via Resend
    // For now, create a monitoring alert as a report delivery notification
    await prisma.monitoringAlert.create({
      data: {
        userId: sub.userId,
        dotNumber: "REPORT",
        legalName: "Weekly Report",
        alertType: "COMPLIANCE_REPORT",
        severity: "low",
        title: `Weekly Compliance Report — ${summaries.length} carriers`,
        detail: summaries
          .map((s) => `${s.legalName}: Grade ${s.trustGrade ?? "N/A"}, ${s.alertsThisWeek} alerts`)
          .join("; "),
      },
    });

    sent++;
  }

  return NextResponse.json({ sent, total: subscribers.length });
}
