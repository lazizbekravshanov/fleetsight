import { prisma } from "@/lib/prisma";
import { createAlert } from "@/lib/monitoring";

/**
 * Check for enabler-related alerts in the last 24 hours.
 *
 * Triggers:
 *  1. New EnablerCarrierLink to a HIGH or CRITICAL risk enabler
 *  2. Enabler riskTier upgraded to CRITICAL in last 24 hours
 *
 * Returns the total number of alerts created.
 */
export async function checkEnablerAlerts(): Promise<number> {
  let alertsCreated = 0;

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ── 1. New links to HIGH/CRITICAL enablers ─────────────────────
  const newLinks = await prisma.enablerCarrierLink.findMany({
    where: {
      createdAt: { gte: twentyFourHoursAgo },
    },
    include: {
      enabler: {
        select: {
          id: true,
          name: true,
          riskTier: true,
          riskScore: true,
          enablerType: true,
        },
      },
    },
  });

  // Filter to only HIGH/CRITICAL enablers
  const highRiskLinks = newLinks.filter(
    (link) =>
      link.enabler.riskTier === "HIGH" || link.enabler.riskTier === "CRITICAL"
  );

  for (const link of highRiskLinks) {
    const dotStr = link.dotNumber;

    // Find users watching this carrier
    const userIds = await findWatchingUsers(dotStr);
    if (userIds.length === 0) continue;

    // Get carrier legal name
    const dotNum = parseInt(dotStr, 10);
    const carrier = isNaN(dotNum)
      ? null
      : await prisma.fmcsaCarrier.findUnique({
          where: { dotNumber: dotNum },
          select: { legalName: true },
        });
    const legalName = carrier?.legalName ?? `DOT ${dotStr}`;

    const severity = link.enabler.riskTier === "CRITICAL" ? "critical" : "high";

    for (const userId of userIds) {
      await createAlert({
        userId,
        dotNumber: dotStr,
        legalName,
        alertType: "enabler_high_risk_link",
        severity,
        title: `DOT ${dotStr} now linked to high-risk enabler ${link.enabler.name}`,
        detail: `${legalName} has a new ${link.relationship} relationship with ${link.enabler.enablerType} "${link.enabler.name}" (risk tier: ${link.enabler.riskTier}, score: ${link.enabler.riskScore.toFixed(1)}).`,
        newValue: link.enabler.riskTier ?? undefined,
      });
      alertsCreated++;
    }
  }

  // ── 2. Enablers upgraded to CRITICAL recently ──────────────────
  // Find enablers whose updatedAt is recent and riskTier is CRITICAL.
  // We approximate "changed to CRITICAL" by checking updatedAt in last 24h
  // combined with riskTier === "CRITICAL". Enablers that were already
  // CRITICAL and unchanged won't have a recent updatedAt.
  const criticalEnablers = await prisma.enabler.findMany({
    where: {
      riskTier: "CRITICAL",
      updatedAt: { gte: twentyFourHoursAgo },
    },
    select: {
      id: true,
      name: true,
      enablerType: true,
      riskScore: true,
      carrierLinks: {
        where: { isCurrent: true },
        select: { dotNumber: true },
      },
    },
  });

  // Build a set of (enablerName, dotNumber) pairs already alerted above
  // to avoid duplicating alerts for the same link
  const alreadyAlerted = new Set(
    highRiskLinks.map(
      (link) => `${link.enabler.id}:${link.dotNumber}`
    )
  );

  for (const enabler of criticalEnablers) {
    for (const link of enabler.carrierLinks) {
      // Skip if we already alerted on this enabler+dot above
      if (alreadyAlerted.has(`${enabler.id}:${link.dotNumber}`)) continue;

      const dotStr = link.dotNumber;
      const userIds = await findWatchingUsers(dotStr);
      if (userIds.length === 0) continue;

      const dotNum = parseInt(dotStr, 10);
      const carrier = isNaN(dotNum)
        ? null
        : await prisma.fmcsaCarrier.findUnique({
            where: { dotNumber: dotNum },
            select: { legalName: true },
          });
      const legalName = carrier?.legalName ?? `DOT ${dotStr}`;

      for (const userId of userIds) {
        await createAlert({
          userId,
          dotNumber: dotStr,
          legalName,
          alertType: "enabler_critical_upgrade",
          severity: "critical",
          title: `Enabler ${enabler.name} scored as CRITICAL — serves DOT ${dotStr}`,
          detail: `${enabler.enablerType} "${enabler.name}" has been scored as CRITICAL risk (score: ${enabler.riskScore.toFixed(1)}). ${legalName} is a current client.`,
          newValue: "CRITICAL",
        });
        alertsCreated++;
      }
    }
  }

  return alertsCreated;
}

/**
 * Find all user IDs watching a given DOT number via WatchedCarrier or RosterCarrier.
 */
async function findWatchingUsers(dotNumber: string): Promise<string[]> {
  const [watchedEntries, rosterEntries] = await Promise.all([
    prisma.watchedCarrier.findMany({
      where: { dotNumber },
      select: { userId: true },
    }),
    prisma.rosterCarrier.findMany({
      where: { dotNumber },
      select: {
        roster: {
          select: { userId: true },
        },
      },
    }),
  ]);

  return Array.from(
    new Set([
      ...watchedEntries.map((w) => w.userId),
      ...rosterEntries.map((r) => r.roster.userId),
    ])
  );
}
