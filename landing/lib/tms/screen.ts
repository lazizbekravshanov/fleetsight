import { prisma } from "@/lib/prisma";
import type { ScreeningResult } from "./types";

export async function screenCarrier(dotNumber: string): Promise<ScreeningResult> {
  const dot = parseInt(dotNumber);

  const [riskScore, trustScore] = await Promise.all([
    prisma.carrierRiskScore.findUnique({ where: { dotNumber: dot } }).catch(() => null),
    prisma.carrierTrustScore.findUnique({ where: { dotNumber: dot } }).catch(() => null),
  ]);

  const flags: string[] = [];
  let riskLevel: ScreeningResult["riskLevel"] = "low";

  // Check risk signals
  if (riskScore) {
    if (riskScore.compositeScore >= 0.8) {
      riskLevel = "critical";
      flags.push("CRITICAL_RISK_SCORE");
    } else if (riskScore.compositeScore >= 0.6) {
      riskLevel = "high";
      flags.push("HIGH_RISK_SCORE");
    } else if (riskScore.compositeScore >= 0.4) {
      riskLevel = "medium";
    }

    if (riskScore.chameleonScore >= 0.5) {
      flags.push("CHAMELEON_DETECTED");
    }
  }

  // Check trust score
  if (trustScore) {
    if (trustScore.grade === "F") {
      flags.push("FAILING_TRUST_GRADE");
      if (riskLevel === "low") riskLevel = "high";
    }
    if (trustScore.trend === "DECLINING") {
      flags.push("DECLINING_TRUST");
    }
  }

  // Check for recent alerts
  const recentAlerts = await prisma.monitoringAlert
    .count({
      where: {
        dotNumber: dotNumber,
        severity: { in: ["critical", "high"] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    })
    .catch(() => 0);

  if (recentAlerts > 0) {
    flags.push(`${recentAlerts}_RECENT_ALERTS`);
  }

  // Determine approval
  const approved = riskLevel !== "critical" && !flags.includes("CHAMELEON_DETECTED");

  // Try to get legal name
  const carrier = await prisma.fmcsaCarrier.findUnique({
    where: { dotNumber: dot },
    select: { legalName: true },
  }).catch(() => null);

  return {
    dotNumber,
    legalName: carrier?.legalName ?? `USDOT ${dotNumber}`,
    approved,
    riskLevel,
    trustGrade: trustScore?.grade ?? null,
    trustScore: trustScore?.overallScore ?? null,
    compositeRisk: riskScore?.compositeScore ?? null,
    flags,
    checkedAt: new Date().toISOString(),
  };
}
