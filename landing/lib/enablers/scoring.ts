import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────

export type EnablerScoreInputs = {
  totalClients: number;
  activeClients: number;
  oosClients: number;
  chameleonClients: number;
  avgClientLifespanDays: number;
  clientsWithCrashes: number;
  uniquePrincipalsAcrossClients: number;
  clientAddressConcentration: number;
};

export type EnablerScore = {
  score: number;
  tier: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  reasons: string[];
  oosRate: number;
  chameleonRate: number;
  avgClientLifespanMonths: number;
};

// ── Pure scoring function ──────────────────────────────────────

export function scoreEnabler(inputs: EnablerScoreInputs): EnablerScore {
  const {
    totalClients,
    activeClients,
    oosClients,
    chameleonClients,
    avgClientLifespanDays,
    clientsWithCrashes,
    uniquePrincipalsAcrossClients,
    clientAddressConcentration,
  } = inputs;

  const reasons: string[] = [];
  let score = 0;

  // Avoid division by zero
  const safeTotal = totalClients || 1;

  // Signal 1: OOS rate (30% weight)
  const oosRate = oosClients / safeTotal;
  if (oosRate > 0.5) {
    score += 30;
    reasons.push(`Very high OOS rate: ${(oosRate * 100).toFixed(0)}% of clients out of service`);
  } else if (oosRate > 0.3) {
    score += 20;
    reasons.push(`High OOS rate: ${(oosRate * 100).toFixed(0)}% of clients out of service`);
  } else if (oosRate > 0.15) {
    score += 10;
    reasons.push(`Elevated OOS rate: ${(oosRate * 100).toFixed(0)}% of clients out of service`);
  }

  // Signal 2: Chameleon client rate (25% weight)
  const chameleonRate = chameleonClients / safeTotal;
  if (chameleonRate > 0.2) {
    score += 25;
    reasons.push(`Very high chameleon rate: ${(chameleonRate * 100).toFixed(0)}% of clients flagged`);
  } else if (chameleonRate > 0.1) {
    score += 15;
    reasons.push(`Elevated chameleon rate: ${(chameleonRate * 100).toFixed(0)}% of clients flagged`);
  } else if (chameleonClients > 0) {
    score += 8;
    reasons.push(`${chameleonClients} chameleon client(s) detected`);
  }

  // Signal 3: Client lifespan (15% weight)
  if (avgClientLifespanDays < 180) {
    score += 15;
    reasons.push(`Very short avg client lifespan: ${avgClientLifespanDays} days`);
  } else if (avgClientLifespanDays < 365) {
    score += 10;
    reasons.push(`Short avg client lifespan: ${avgClientLifespanDays} days`);
  } else if (avgClientLifespanDays < 540) {
    score += 5;
    reasons.push(`Below-average client lifespan: ${avgClientLifespanDays} days`);
  }

  // Signal 4: Principal concentration (15% weight)
  const principalRatio =
    totalClients > 0 ? uniquePrincipalsAcrossClients / totalClients : 1;
  if (principalRatio < 0.2 && totalClients >= 5) {
    score += 15;
    reasons.push(
      `Very low principal diversity: ${uniquePrincipalsAcrossClients} unique principals across ${totalClients} clients`
    );
  } else if (principalRatio < 0.4 && totalClients >= 5) {
    score += 8;
    reasons.push(
      `Low principal diversity: ${uniquePrincipalsAcrossClients} unique principals across ${totalClients} clients`
    );
  }

  // Signal 5: Address clustering (15% weight)
  if (clientAddressConcentration > 0.5) {
    score += 15;
    reasons.push(
      `High address clustering: ${(clientAddressConcentration * 100).toFixed(0)}% of clients share the same address`
    );
  } else if (clientAddressConcentration > 0.25) {
    score += 8;
    reasons.push(
      `Moderate address clustering: ${(clientAddressConcentration * 100).toFixed(0)}% of clients share the same address`
    );
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine tier
  let tier: EnablerScore["tier"];
  if (score >= 70) {
    tier = "CRITICAL";
  } else if (score >= 45) {
    tier = "HIGH";
  } else if (score >= 25) {
    tier = "MODERATE";
  } else {
    tier = "LOW";
  }

  const avgClientLifespanMonths = parseFloat(
    (avgClientLifespanDays / 30.44).toFixed(1)
  );

  return {
    score,
    tier,
    reasons,
    oosRate: parseFloat(oosRate.toFixed(4)),
    chameleonRate: parseFloat(chameleonRate.toFixed(4)),
    avgClientLifespanMonths,
  };
}

// ── Compute score from database ────────────────────────────────

export async function computeEnablerScore(
  enablerId: string
): Promise<EnablerScore> {
  // Load enabler with all carrier links
  const enabler = await prisma.enabler.findUniqueOrThrow({
    where: { id: enablerId },
    include: { carrierLinks: true },
  });

  const dotNumbers = enabler.carrierLinks.map((link) => link.dotNumber);
  const dotNumbersInt = dotNumbers.map((d) => parseInt(d, 10)).filter((n) => !isNaN(n));

  if (dotNumbersInt.length === 0) {
    const emptyScore = scoreEnabler({
      totalClients: 0,
      activeClients: 0,
      oosClients: 0,
      chameleonClients: 0,
      avgClientLifespanDays: 0,
      clientsWithCrashes: 0,
      uniquePrincipalsAcrossClients: 0,
      clientAddressConcentration: 0,
    });

    await prisma.enabler.update({
      where: { id: enablerId },
      data: {
        clientCount: 0,
        activeClientCount: 0,
        oosClientCount: 0,
        chameleonClientCount: 0,
        avgClientLifespanDays: 0,
        riskScore: emptyScore.score,
        riskTier: emptyScore.tier,
      },
    });

    return emptyScore;
  }

  // Get carrier statuses
  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: dotNumbersInt } },
    select: { dotNumber: true, statusCode: true, addDate: true },
  });

  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));

  let activeClients = 0;
  let oosClients = 0;
  let lifespanSum = 0;
  let lifespanCount = 0;
  const now = new Date();

  for (const dot of dotNumbersInt) {
    const carrier = carrierMap.get(dot);
    if (!carrier) continue;

    const isOos =
      carrier.statusCode === "OUT-OF-SERVICE" ||
      carrier.statusCode === "OOS" ||
      carrier.statusCode === "NOT AUTHORIZED";

    if (isOos) {
      oosClients++;
    } else {
      activeClients++;
    }

    // Compute lifespan: addDate to now (active) or treat as still active for avg
    if (carrier.addDate) {
      const endDate = now;
      const days = Math.floor(
        (endDate.getTime() - carrier.addDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0) {
        lifespanSum += days;
        lifespanCount++;
      }
    }
  }

  const totalClients = dotNumbersInt.length;
  const avgClientLifespanDays =
    lifespanCount > 0 ? Math.round(lifespanSum / lifespanCount) : 0;

  // Count chameleon clients (chameleonScore > 50)
  const chameleonScores = await prisma.carrierRiskScore.findMany({
    where: {
      dotNumber: { in: dotNumbersInt },
      chameleonScore: { gt: 50 },
    },
    select: { dotNumber: true },
  });
  const chameleonClients = chameleonScores.length;

  // Count clients with crashes
  const crashDots = await prisma.fmcsaCrash.groupBy({
    by: ["dotNumber"],
    where: { dotNumber: { in: dotNumbersInt } },
  });
  const clientsWithCrashes = crashDots.length;

  // Principal concentration: count distinct nameNormalized across all linked dotNumbers
  const principals = await prisma.carrierPrincipal.findMany({
    where: { dotNumber: { in: dotNumbersInt } },
    select: { nameNormalized: true },
    distinct: ["nameNormalized"],
  });
  const uniquePrincipalsAcrossClients = principals.length;

  // Address clustering: find the most common normalized address among linked carriers
  const addresses = await prisma.carrierAddress.findMany({
    where: { dotNumber: { in: dotNumbersInt } },
    select: { dotNumber: true, normalized: true },
  });

  let clientAddressConcentration = 0;
  if (addresses.length > 0 && totalClients > 0) {
    // Count how many unique dotNumbers share each address
    const addressCounts = new Map<string, Set<number>>();
    for (const addr of addresses) {
      if (!addressCounts.has(addr.normalized)) {
        addressCounts.set(addr.normalized, new Set());
      }
      addressCounts.get(addr.normalized)!.add(addr.dotNumber);
    }

    let maxSharing = 0;
    for (const dots of addressCounts.values()) {
      if (dots.size > maxSharing) {
        maxSharing = dots.size;
      }
    }
    clientAddressConcentration = maxSharing / totalClients;
  }

  // Compute score
  const result = scoreEnabler({
    totalClients,
    activeClients,
    oosClients,
    chameleonClients,
    avgClientLifespanDays,
    clientsWithCrashes,
    uniquePrincipalsAcrossClients,
    clientAddressConcentration,
  });

  // Update enabler record
  await prisma.enabler.update({
    where: { id: enablerId },
    data: {
      clientCount: totalClients,
      activeClientCount: activeClients,
      oosClientCount: oosClients,
      chameleonClientCount: chameleonClients,
      avgClientLifespanDays,
      riskScore: result.score,
      riskTier: result.tier,
    },
  });

  return result;
}

// ── Enabler detail view ────────────────────────────────────────

export async function getEnablerDetail(enablerId: string): Promise<{
  enabler: any;
  score: EnablerScore;
  clients: {
    dotNumber: string;
    legalName: string;
    statusCode: string | null;
    relationship: string;
    isCurrent: boolean;
  }[];
}> {
  const enabler = await prisma.enabler.findUniqueOrThrow({
    where: { id: enablerId },
    include: { carrierLinks: true },
  });

  // Compute fresh score
  const score = await computeEnablerScore(enablerId);

  // Build client list with carrier info
  const dotNumbersInt = enabler.carrierLinks
    .map((link) => parseInt(link.dotNumber, 10))
    .filter((n) => !isNaN(n));

  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: dotNumbersInt } },
    select: { dotNumber: true, legalName: true, statusCode: true },
  });

  const carrierMap = new Map(carriers.map((c) => [String(c.dotNumber), c]));

  const clients = enabler.carrierLinks.map((link) => {
    const carrier = carrierMap.get(link.dotNumber);
    return {
      dotNumber: link.dotNumber,
      legalName: carrier?.legalName ?? "Unknown",
      statusCode: carrier?.statusCode ?? null,
      relationship: link.relationship,
      isCurrent: link.isCurrent,
    };
  });

  return { enabler, score, clients };
}

// ── Carrier's enablers lookup ──────────────────────────────────

export async function getCarrierEnablers(dotNumber: string): Promise<{
  enablers: {
    id: string;
    name: string;
    type: string;
    relationship: string;
    riskScore: number;
    riskTier: string | null;
    isCurrent: boolean;
  }[];
  warnings: string[];
}> {
  const links = await prisma.enablerCarrierLink.findMany({
    where: { dotNumber },
    include: {
      enabler: {
        select: {
          id: true,
          name: true,
          enablerType: true,
          riskScore: true,
          riskTier: true,
        },
      },
    },
  });

  const warnings: string[] = [];
  const enablers = links.map((link) => {
    if (link.enabler.riskTier === "CRITICAL") {
      warnings.push(
        `${link.enabler.name} (${link.enabler.enablerType}) has CRITICAL risk tier`
      );
    } else if (link.enabler.riskTier === "HIGH") {
      warnings.push(
        `${link.enabler.name} (${link.enabler.enablerType}) has HIGH risk tier`
      );
    }

    return {
      id: link.enabler.id,
      name: link.enabler.name,
      type: link.enabler.enablerType,
      relationship: link.relationship,
      riskScore: link.enabler.riskScore,
      riskTier: link.enabler.riskTier,
      isCurrent: link.isCurrent,
    };
  });

  return { enablers, warnings };
}
