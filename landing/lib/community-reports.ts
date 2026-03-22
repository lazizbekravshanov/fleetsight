import { prisma } from "@/lib/prisma";

export const REPORT_TYPES = [
  { value: "double_brokering", label: "Double Brokering", severity: "critical" },
  { value: "cargo_theft", label: "Cargo Theft", severity: "critical" },
  { value: "no_show", label: "No Show", severity: "high" },
  { value: "payment_failure", label: "Payment Failure", severity: "high" },
  { value: "safety_concern", label: "Safety Concern", severity: "medium" },
  { value: "fraud", label: "Fraud", severity: "critical" },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["value"];

export function isValidReportType(type: string): type is ReportType {
  return REPORT_TYPES.some((rt) => rt.value === type);
}

export function getReportSeverity(type: ReportType): string {
  return REPORT_TYPES.find((rt) => rt.value === type)?.severity ?? "medium";
}

export async function recalculateSummary(dotNumber: string) {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const reports = await prisma.communityReport.findMany({
    where: {
      dotNumber,
      status: "active",
      createdAt: { gte: twelveMonthsAgo },
    },
    select: {
      userId: true,
      reportType: true,
      createdAt: true,
    },
  });

  const totalReports12m = reports.length;
  const uniqueReporters = new Set(reports.map((r) => r.userId)).size;
  const uniqueTypes = new Set(reports.map((r) => r.reportType)).size;

  // Count by type
  const reportsByType: Record<string, number> = {};
  for (const r of reports) {
    reportsByType[r.reportType] = (reportsByType[r.reportType] ?? 0) + 1;
  }

  // communityScore = min(100, totalReports12m * 8 + uniqueReporters * 5 + uniqueTypes * 3)
  const communityScore = Math.min(
    100,
    totalReports12m * 8 + uniqueReporters * 5 + uniqueTypes * 3
  );

  const isFlagged = totalReports12m >= 3;
  const lastReportAt =
    reports.length > 0
      ? reports.reduce((latest, r) =>
          r.createdAt > latest ? r.createdAt : latest,
          reports[0].createdAt
        )
      : null;

  await prisma.communityReportSummary.upsert({
    where: { dotNumber },
    create: {
      dotNumber,
      totalReports12m,
      reportsByType: JSON.stringify(reportsByType),
      communityScore,
      isFlagged,
      lastReportAt,
    },
    update: {
      totalReports12m,
      reportsByType: JSON.stringify(reportsByType),
      communityScore,
      isFlagged,
      lastReportAt,
    },
  });

  return { totalReports12m, reportsByType, communityScore, isFlagged, lastReportAt };
}
