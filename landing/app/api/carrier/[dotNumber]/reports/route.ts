import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isValidReportType, getReportSeverity, recalculateSummary, REPORT_TYPES } from "@/lib/community-reports";

const submitSchema = z.object({
  reportType: z.string(),
  description: z.string().min(10).max(2000),
});

/** POST — Submit a community report */
export async function POST(
  req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerAuthSession();
  const userId = session?.user?.id ?? "anonymous";

  const dotNumber = context.params.dotNumber;
  if (!/^\d{1,10}$/.test(dotNumber)) {
    return jsonError("Invalid DOT number", 400);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid report. Provide reportType and description (10-2000 chars).", 400);
  }

  if (!isValidReportType(parsed.data.reportType)) {
    return jsonError(`Invalid report type. Valid types: ${REPORT_TYPES.map((t) => t.value).join(", ")}`, 400);
  }

  // Rate limit: max 10 reports/day per user
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await prisma.communityReport.count({
    where: { userId: userId, createdAt: { gte: dayAgo } },
  });
  if (dailyCount >= 10) {
    return jsonError("Daily report limit reached (10/day). Try again tomorrow.", 429);
  }

  // Cooldown: 30-day per user/carrier/type combo
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSameType = await prisma.communityReport.findFirst({
    where: {
      userId: userId,
      dotNumber,
      reportType: parsed.data.reportType,
      createdAt: { gte: thirtyDaysAgo },
    },
  });
  if (recentSameType) {
    return jsonError(
      `You already submitted a ${parsed.data.reportType} report for this carrier within the last 30 days.`,
      409
    );
  }

  const severity = getReportSeverity(parsed.data.reportType);

  const report = await prisma.communityReport.create({
    data: {
      userId: userId,
      dotNumber,
      reportType: parsed.data.reportType,
      description: parsed.data.description,
      severity,
    },
  });

  // Recalculate summary asynchronously
  await recalculateSummary(dotNumber);

  return Response.json(
    {
      id: report.id,
      reportType: report.reportType,
      severity: report.severity,
      createdAt: report.createdAt.toISOString(),
    },
    { status: 201 }
  );
}

/** GET — Get aggregate report data for a carrier (public) */
export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const dotNumber = context.params.dotNumber;
  if (!/^\d{1,10}$/.test(dotNumber)) {
    return jsonError("Invalid DOT number", 400);
  }

  const summary = await prisma.communityReportSummary.findUnique({
    where: { dotNumber },
  });

  if (!summary) {
    return Response.json({
      dotNumber,
      totalReports12m: 0,
      reportsByType: {},
      communityScore: 0,
      isFlagged: false,
      lastReportAt: null,
    });
  }

  return Response.json({
    dotNumber,
    totalReports12m: summary.totalReports12m,
    reportsByType: JSON.parse(summary.reportsByType),
    communityScore: summary.communityScore,
    isFlagged: summary.isFlagged,
    lastReportAt: summary.lastReportAt?.toISOString() ?? null,
  });
}
