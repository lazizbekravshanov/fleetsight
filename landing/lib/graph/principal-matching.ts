import { prisma } from "@/lib/prisma";
import { normalizeName } from "./normalize";

export type PrincipalCluster = {
  nameNormalized: string;
  dotNumbers: number[];
  carriers: { dotNumber: number; legalName: string; title: string | null }[];
};

/**
 * Populate CarrierPrincipal table from FmcsaCarrier officer fields.
 */
export async function populatePrincipals(): Promise<number> {
  const carriers = await prisma.fmcsaCarrier.findMany({
    select: {
      dotNumber: true,
      companyOfficer1: true,
      companyOfficer2: true,
    },
  });

  let count = 0;
  for (const c of carriers) {
    for (const officer of [c.companyOfficer1, c.companyOfficer2]) {
      if (!officer || officer.trim().length < 3) continue;

      const nameNorm = normalizeName(officer);
      if (nameNorm.length < 3) continue;

      try {
        await prisma.carrierPrincipal.create({
          data: {
            dotNumber: c.dotNumber,
            principalName: officer.trim(),
            nameNormalized: nameNorm,
            title: null,
          },
        });
        count++;
      } catch {
        // Skip duplicates
      }
    }
  }

  return count;
}

/**
 * Find all principal names that appear across 2+ carriers.
 */
export async function findSharedPrincipals(): Promise<PrincipalCluster[]> {
  const groups = await prisma.carrierPrincipal.groupBy({
    by: ["nameNormalized"],
    _count: true,
    having: { nameNormalized: { _count: { gt: 1 } } },
    orderBy: { _count: { nameNormalized: "desc" } },
  });

  const results: PrincipalCluster[] = [];

  for (const g of groups) {
    const principals = await prisma.carrierPrincipal.findMany({
      where: { nameNormalized: g.nameNormalized },
      select: { dotNumber: true, title: true },
    });

    const dotNumbers = [...new Set(principals.map((p) => p.dotNumber))];
    const carriers = await prisma.fmcsaCarrier.findMany({
      where: { dotNumber: { in: dotNumbers } },
      select: { dotNumber: true, legalName: true },
    });

    results.push({
      nameNormalized: g.nameNormalized,
      dotNumbers,
      carriers: carriers.map((c) => ({
        dotNumber: c.dotNumber,
        legalName: c.legalName,
        title: principals.find((p) => p.dotNumber === c.dotNumber)?.title ?? null,
      })),
    });
  }

  return results;
}

/**
 * Get principals shared with a specific carrier's officers.
 */
export async function getPrincipalAffiliates(dotNumber: number): Promise<{
  officers: string[];
  sharedPrincipals: PrincipalCluster[];
}> {
  const myPrincipals = await prisma.carrierPrincipal.findMany({
    where: { dotNumber },
    select: { principalName: true, nameNormalized: true },
  });

  if (myPrincipals.length === 0) {
    // Try populating from FmcsaCarrier
    const carrier = await prisma.fmcsaCarrier.findUnique({
      where: { dotNumber },
      select: { companyOfficer1: true, companyOfficer2: true },
    });

    const officers = [carrier?.companyOfficer1, carrier?.companyOfficer2].filter(
      (o): o is string => !!o && o.trim().length >= 3
    );

    for (const officer of officers) {
      const nameNorm = normalizeName(officer);
      if (nameNorm.length < 3) continue;
      await prisma.carrierPrincipal.create({
        data: { dotNumber, principalName: officer.trim(), nameNormalized: nameNorm },
      }).catch(() => {});
    }

    // Re-fetch
    const updated = await prisma.carrierPrincipal.findMany({
      where: { dotNumber },
      select: { principalName: true, nameNormalized: true },
    });
    myPrincipals.push(...updated);
  }

  if (myPrincipals.length === 0) {
    return { officers: [], sharedPrincipals: [] };
  }

  const names = myPrincipals.map((p) => p.nameNormalized);

  // Find other carriers with matching officer names
  const matches = await prisma.carrierPrincipal.findMany({
    where: {
      nameNormalized: { in: names },
      dotNumber: { not: dotNumber },
    },
    select: { dotNumber: true, principalName: true, nameNormalized: true, title: true },
  });

  // Group by name
  const byName = new Map<string, { dotNumber: number; title: string | null }[]>();
  for (const m of matches) {
    const list = byName.get(m.nameNormalized) ?? [];
    list.push({ dotNumber: m.dotNumber, title: m.title });
    byName.set(m.nameNormalized, list);
  }

  const dotNumbers = [...new Set(matches.map((m) => m.dotNumber))];
  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: dotNumbers } },
    select: { dotNumber: true, legalName: true },
  });
  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c.legalName]));

  const sharedPrincipals: PrincipalCluster[] = [];
  for (const [name, entries] of byName) {
    const dots = [...new Set(entries.map((e) => e.dotNumber))];
    sharedPrincipals.push({
      nameNormalized: name,
      dotNumbers: dots,
      carriers: dots.map((d) => ({
        dotNumber: d,
        legalName: carrierMap.get(d) ?? `DOT ${d}`,
        title: entries.find((e) => e.dotNumber === d)?.title ?? null,
      })),
    });
  }

  return {
    officers: myPrincipals.map((p) => p.principalName),
    sharedPrincipals,
  };
}
