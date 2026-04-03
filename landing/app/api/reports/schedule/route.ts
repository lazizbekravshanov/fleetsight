import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reports/schedule — get user's scheduled reports
export async function GET() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ carriers: [], schedule: { enabled: false, frequency: "weekly", nextRun: null } });

  const watched = await prisma.watchedCarrier.findMany({
    where: { userId: session.user.id },
    select: { dotNumber: true, legalName: true },
  });

  // Return the user's watched carriers as candidates for scheduled reports
  // The actual scheduling is handled by the cron endpoint
  return NextResponse.json({
    carriers: watched,
    schedule: {
      enabled: watched.length > 0,
      frequency: "weekly",
      nextRun: getNextMonday(),
    },
  });
}

// POST /api/reports/schedule — trigger a compliance report for specific carriers
export async function POST(req: NextRequest) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to generate reports" }, { status: 401 });

  const body = await req.json();
  const { dotNumbers } = body;

  if (!Array.isArray(dotNumbers) || dotNumbers.length === 0) {
    return NextResponse.json({ error: "dotNumbers array required" }, { status: 400 });
  }

  if (dotNumbers.length > 20) {
    return NextResponse.json({ error: "Maximum 20 carriers per report" }, { status: 400 });
  }

  // Generate report data for each carrier
  const reports = await Promise.all(
    dotNumbers.map(async (dot: string) => {
      try {
        const [riskScore, trustScore] = await Promise.all([
          prisma.carrierRiskScore.findUnique({ where: { dotNumber: parseInt(dot) } }),
          prisma.carrierTrustScore.findUnique({ where: { dotNumber: parseInt(dot) } }),
        ]);

        const recentAlerts = await prisma.monitoringAlert.findMany({
          where: { userId: session.user!.id!, dotNumber: dot },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        return {
          dotNumber: dot,
          riskScore: riskScore
            ? { chameleon: riskScore.chameleonScore, safety: riskScore.safetyScore, composite: riskScore.compositeScore }
            : null,
          trustScore: trustScore
            ? { overall: trustScore.overallScore, grade: trustScore.grade, trend: trustScore.trend }
            : null,
          recentAlerts: recentAlerts.map((a) => ({
            type: a.alertType,
            severity: a.severity,
            title: a.title,
            date: a.createdAt.toISOString(),
          })),
        };
      } catch {
        return { dotNumber: dot, error: "Failed to generate report" };
      }
    })
  );

  return NextResponse.json({
    report: {
      generatedAt: new Date().toISOString(),
      carrierCount: dotNumbers.length,
      carriers: reports,
    },
  });
}

function getNextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(8, 0, 0, 0);
  return d.toISOString();
}
