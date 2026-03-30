import { prisma } from "@/lib/prisma";
import { createAlert } from "@/lib/monitoring";

/**
 * Check for inspection-related alerts in the last 24 hours.
 *
 * Triggers:
 *  1. OOS violation detected → CRITICAL
 *  2. More than 3 violations in a single inspection → HIGH
 *  3. Violation rate in last 30 days > 2x prior 30-day period → HIGH
 *
 * Returns the total number of alerts created.
 */
export async function checkInspectionAlerts(): Promise<number> {
  let alertsCreated = 0;

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // ── 1. Get recent violations grouped by dotNumber ──────────────
  const recentViolations = await prisma.inspectionViolation.findMany({
    where: {
      ingestedAt: { gte: twentyFourHoursAgo },
    },
    select: {
      dotNumber: true,
      inspectionId: true,
      oosViolation: true,
      violationCode: true,
      violationDescription: true,
    },
  });

  if (recentViolations.length === 0) {
    return 0;
  }

  // Group by dotNumber
  const byDot = new Map<
    number,
    { inspectionId: string; oosViolation: boolean; violationCode: string; violationDescription: string | null }[]
  >();
  for (const v of recentViolations) {
    const existing = byDot.get(v.dotNumber) ?? [];
    existing.push({
      inspectionId: v.inspectionId,
      oosViolation: v.oosViolation,
      violationCode: v.violationCode,
      violationDescription: v.violationDescription,
    });
    byDot.set(v.dotNumber, existing);
  }

  // ── 2. For each DOT, find watching users and generate alerts ───
  for (const [dotNumber, violations] of byDot) {
    const dotStr = String(dotNumber);

    // Find all users watching this DOT
    const [watchedEntries, rosterEntries] = await Promise.all([
      prisma.watchedCarrier.findMany({
        where: { dotNumber: dotStr },
        select: { userId: true },
      }),
      prisma.rosterCarrier.findMany({
        where: { dotNumber: dotStr },
        select: {
          roster: {
            select: { userId: true },
          },
        },
      }),
    ]);

    const userIds = Array.from(
      new Set([
        ...watchedEntries.map((w) => w.userId),
        ...rosterEntries.map((r) => r.roster.userId),
      ])
    );

    if (userIds.length === 0) continue;

    // Look up carrier legal name
    const carrier = await prisma.fmcsaCarrier.findUnique({
      where: { dotNumber },
      select: { legalName: true },
    });
    const legalName = carrier?.legalName ?? `DOT ${dotStr}`;

    // ── Check 1: OOS violations ────────────────────────────────
    const hasOos = violations.some((v) => v.oosViolation);
    if (hasOos) {
      const oosViolations = violations.filter((v) => v.oosViolation);
      const oosDescriptions = oosViolations
        .map((v) => v.violationDescription ?? v.violationCode)
        .slice(0, 3)
        .join("; ");

      for (const userId of userIds) {
        await createAlert({
          userId,
          dotNumber: dotStr,
          legalName,
          alertType: "inspection_oos",
          severity: "critical",
          title: `DOT ${dotStr} inspected with OOS violation`,
          detail: `${legalName} received ${oosViolations.length} out-of-service violation${oosViolations.length > 1 ? "s" : ""}: ${oosDescriptions}`,
        });
        alertsCreated++;
      }
    }

    // ── Check 2: More than 3 violations in a single inspection ─
    const byInspection = new Map<string, typeof violations>();
    for (const v of violations) {
      const existing = byInspection.get(v.inspectionId) ?? [];
      existing.push(v);
      byInspection.set(v.inspectionId, existing);
    }

    for (const [inspectionId, inspViolations] of byInspection) {
      if (inspViolations.length > 3) {
        for (const userId of userIds) {
          await createAlert({
            userId,
            dotNumber: dotStr,
            legalName,
            alertType: "inspection_multi_violation",
            severity: "high",
            title: `DOT ${dotStr} received ${inspViolations.length} violations in single inspection`,
            detail: `Inspection ${inspectionId}: ${legalName} received ${inspViolations.length} violations in one inspection session.`,
            newValue: String(inspViolations.length),
          });
          alertsCreated++;
        }
      }
    }

    // ── Check 3: Violation rate spike (last 30d vs prior 30d) ──
    const [recentCount, priorCount] = await Promise.all([
      prisma.inspectionViolation.count({
        where: {
          dotNumber,
          inspectionDate: { gte: thirtyDaysAgo },
        },
      }),
      prisma.inspectionViolation.count({
        where: {
          dotNumber,
          inspectionDate: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      }),
    ]);

    // Only alert if there is meaningful prior activity and the rate doubled
    if (priorCount > 0 && recentCount > 2 * priorCount) {
      for (const userId of userIds) {
        await createAlert({
          userId,
          dotNumber: dotStr,
          legalName,
          alertType: "violation_rate_spike",
          severity: "high",
          title: `DOT ${dotStr} violation rate spiking`,
          detail: `${legalName} had ${recentCount} violations in the last 30 days vs ${priorCount} in the prior 30-day period (${((recentCount / priorCount) * 100).toFixed(0)}% increase).`,
          previousValue: String(priorCount),
          newValue: String(recentCount),
        });
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}
