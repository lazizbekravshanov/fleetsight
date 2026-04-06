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

  // All users with watched carriers get a weekly compliance report.
  // Subscriptions/credits were removed in the agentic pivot.
  const users = await prisma.user.findMany({
    where: { watchedCarriers: { some: {} } },
    include: { watchedCarriers: true, profile: true },
  });

  let sent = 0;

  for (const user of users) {
    if (!user.watchedCarriers.length || !user.email) continue;

    const dotNumbers = user.watchedCarriers.map((w) => w.dotNumber);

    const summaries = await Promise.all(
      dotNumbers.slice(0, 20).map(async (dot: string) => {
        const dotInt = parseInt(dot, 10);
        const [risk, trust, alertCount] = await Promise.all([
          Number.isFinite(dotInt)
            ? prisma.carrierRiskScore.findUnique({ where: { dotNumber: dotInt } })
            : Promise.resolve(null),
          Number.isFinite(dotInt)
            ? prisma.carrierTrustScore.findUnique({ where: { dotNumber: dotInt } })
            : Promise.resolve(null),
          prisma.monitoringAlert.count({
            where: {
              userId: user.id,
              dotNumber: dot,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

        const watched = user.watchedCarriers.find((w) => w.dotNumber === dot);
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

    await prisma.monitoringAlert.create({
      data: {
        userId: user.id,
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

  return NextResponse.json({ sent, total: users.length });
}
