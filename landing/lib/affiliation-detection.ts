import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeVin } from "@/lib/vin-utils";
import { computeAffiliationScore, nameSimilarity, type AffiliationType } from "@/lib/affiliation-scoring";

export type SharedVinResult = {
  dotNumber: number;
  legalName: string | null;
  statusCode: string | null;
  sharedVinCount: number;
  sharedVins: string[];
  affiliationScore: number;
  affiliationType: AffiliationType;
  signals: string[];
};

/**
 * Find all carriers that share VINs with a given carrier, computing affiliation scores.
 */
export async function getSharedVinsForCarrier(
  dotNumber: number
): Promise<SharedVinResult[]> {
  // Step 1: Get all VINs for this carrier
  const myVehicles = await prisma.carrierVehicle.findMany({
    where: { dotNumber },
    select: { vin: true },
  });

  if (myVehicles.length === 0) return [];

  const myVins = myVehicles.map((v) => v.vin);

  // Step 2: Find other carriers that share these VINs
  const sharedRecords = await prisma.carrierVehicle.findMany({
    where: {
      vin: { in: myVins },
      dotNumber: { not: dotNumber },
    },
    select: {
      dotNumber: true,
      vin: true,
    },
  });

  if (sharedRecords.length === 0) return [];

  // Step 3: Group by carrier
  const carrierVinMap = new Map<number, Set<string>>();
  for (const rec of sharedRecords) {
    const set = carrierVinMap.get(rec.dotNumber) ?? new Set();
    set.add(rec.vin);
    carrierVinMap.set(rec.dotNumber, set);
  }

  // Step 4: Get carrier info + compute scores
  const otherDots = [...carrierVinMap.keys()];
  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: otherDots } },
    select: {
      dotNumber: true,
      legalName: true,
      statusCode: true,
      phyStreet: true,
      phyCity: true,
      phyState: true,
      addDate: true,
      powerUnits: true,
    },
  });

  const myCarrier = await prisma.fmcsaCarrier.findUnique({
    where: { dotNumber },
    select: {
      legalName: true,
      phyStreet: true,
      phyCity: true,
      phyState: true,
      addDate: true,
      powerUnits: true,
      statusCode: true,
    },
  });

  // Get other carriers' total VIN counts
  const otherVinCounts = await prisma.carrierVehicle.groupBy({
    by: ["dotNumber"],
    where: { dotNumber: { in: otherDots } },
    _count: true,
  });
  const vinCountMap = new Map(otherVinCounts.map((v) => [v.dotNumber, v._count]));

  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));

  const results: SharedVinResult[] = [];

  for (const [otherDot, sharedVins] of carrierVinMap) {
    const otherCarrier = carrierMap.get(otherDot);
    const otherTotalVins = vinCountMap.get(otherDot) ?? sharedVins.size;

    const { score, type, signals } = computeAffiliationScore({
      sharedVinCount: sharedVins.size,
      totalVinsA: myVins.length,
      totalVinsB: otherTotalVins,
      samePhysicalAddress:
        !!myCarrier?.phyStreet &&
        !!otherCarrier?.phyStreet &&
        myCarrier.phyStreet.toUpperCase() === otherCarrier.phyStreet.toUpperCase() &&
        myCarrier.phyCity?.toUpperCase() === otherCarrier?.phyCity?.toUpperCase(),
      sameCityState:
        !!myCarrier?.phyCity &&
        !!otherCarrier?.phyCity &&
        myCarrier.phyCity.toUpperCase() === otherCarrier.phyCity.toUpperCase() &&
        myCarrier.phyState === otherCarrier?.phyState,
      sameState: myCarrier?.phyState === otherCarrier?.phyState,
      nameSimilarity: nameSimilarity(
        myCarrier?.legalName ?? "",
        otherCarrier?.legalName ?? ""
      ),
      carrierAOosDate: null, // TODO: populate from FMCSA OOS data
      carrierBCreatedDate: otherCarrier?.addDate ?? null,
      carrierBOosDate: null,
      carrierACreatedDate: myCarrier?.addDate ?? null,
    });

    results.push({
      dotNumber: otherDot,
      legalName: otherCarrier?.legalName ?? null,
      statusCode: otherCarrier?.statusCode ?? null,
      sharedVinCount: sharedVins.size,
      sharedVins: [...sharedVins],
      affiliationScore: score,
      affiliationType: type,
      signals,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.affiliationScore - a.affiliationScore);

  return results;
}

/**
 * Get details for a specific shared VIN — all carriers that have used it.
 */
export async function getVinCarriers(vin: string) {
  const records = await prisma.carrierVehicle.findMany({
    where: { vin },
    include: {
      vehicle: true,
      carrier: {
        select: {
          dotNumber: true,
          legalName: true,
          statusCode: true,
        },
      },
    },
    orderBy: { firstSeenAt: "asc" },
  });

  return records.map((r) => ({
    dotNumber: r.dotNumber,
    legalName: r.carrier?.legalName ?? null,
    statusCode: r.carrier?.statusCode ?? null,
    unitType: r.unitType,
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
    source: r.source,
    vehicle: r.vehicle
      ? {
          vin: r.vehicle.vin,
          make: r.vehicle.make,
          model: r.vehicle.model,
          modelYear: r.vehicle.modelYear,
          bodyClass: r.vehicle.bodyClass,
          vehicleType: r.vehicle.vehicleType,
        }
      : null,
  }));
}

/**
 * Batch detect affiliations across all carriers with shared VINs.
 * Uses raw SQL for the self-join for performance.
 */
export async function detectAllAffiliations(): Promise<{
  pairsFound: number;
  pairsUpserted: number;
}> {
  // Self-join to find all carrier pairs sharing VINs
  const pairs = await prisma.$queryRaw<
    { dotA: number; dotB: number; sharedCount: number; sharedVins: string }[]
  >(Prisma.sql`
    SELECT
      a."dotNumber" AS "dotA",
      b."dotNumber" AS "dotB",
      COUNT(DISTINCT a.vin)::int AS "sharedCount",
      STRING_AGG(DISTINCT a.vin, ',') AS "sharedVins"
    FROM "CarrierVehicle" a
    JOIN "CarrierVehicle" b
      ON a.vin = b.vin
      AND a."dotNumber" < b."dotNumber"
    GROUP BY a."dotNumber", b."dotNumber"
    HAVING COUNT(DISTINCT a.vin) >= 1
    ORDER BY "sharedCount" DESC
  `);

  let upserted = 0;

  for (const pair of pairs) {
    const sharedVins = pair.sharedVins.split(",");

    // Get carrier info for scoring
    const [carrierA, carrierB] = await Promise.all([
      prisma.fmcsaCarrier.findUnique({
        where: { dotNumber: pair.dotA },
        select: { legalName: true, phyStreet: true, phyCity: true, phyState: true, addDate: true },
      }),
      prisma.fmcsaCarrier.findUnique({
        where: { dotNumber: pair.dotB },
        select: { legalName: true, phyStreet: true, phyCity: true, phyState: true, addDate: true },
      }),
    ]);

    // Get fleet sizes
    const [countA, countB] = await Promise.all([
      prisma.carrierVehicle.count({ where: { dotNumber: pair.dotA } }),
      prisma.carrierVehicle.count({ where: { dotNumber: pair.dotB } }),
    ]);

    const { score, type } = computeAffiliationScore({
      sharedVinCount: pair.sharedCount,
      totalVinsA: countA,
      totalVinsB: countB,
      samePhysicalAddress:
        !!carrierA?.phyStreet &&
        !!carrierB?.phyStreet &&
        carrierA.phyStreet.toUpperCase() === carrierB.phyStreet.toUpperCase() &&
        carrierA.phyCity?.toUpperCase() === carrierB.phyCity?.toUpperCase(),
      sameCityState:
        !!carrierA?.phyCity &&
        carrierA.phyCity.toUpperCase() === (carrierB?.phyCity?.toUpperCase() ?? "") &&
        carrierA.phyState === carrierB?.phyState,
      sameState: carrierA?.phyState === carrierB?.phyState,
      nameSimilarity: nameSimilarity(
        carrierA?.legalName ?? "",
        carrierB?.legalName ?? ""
      ),
      carrierAOosDate: null,
      carrierBCreatedDate: carrierB?.addDate ?? null,
      carrierBOosDate: null,
      carrierACreatedDate: carrierA?.addDate ?? null,
    });

    await prisma.carrierAffiliation.upsert({
      where: {
        dotNumberA_dotNumberB: {
          dotNumberA: pair.dotA,
          dotNumberB: pair.dotB,
        },
      },
      create: {
        dotNumberA: pair.dotA,
        dotNumberB: pair.dotB,
        sharedVinCount: pair.sharedCount,
        affiliationScore: score,
        affiliationType: type,
        sharedVinsJson: JSON.stringify(sharedVins),
      },
      update: {
        sharedVinCount: pair.sharedCount,
        affiliationScore: score,
        affiliationType: type,
        sharedVinsJson: JSON.stringify(sharedVins),
      },
    });

    upserted++;
  }

  return { pairsFound: pairs.length, pairsUpserted: upserted };
}

/**
 * Populate Vehicle + CarrierVehicle records from existing FmcsaInspection VINs.
 */
export async function populateVehiclesFromInspections(): Promise<number> {
  const inspections = await prisma.fmcsaInspection.findMany({
    where: {
      vin: { not: null },
    },
    select: {
      dotNumber: true,
      vin: true,
      inspectionDate: true,
    },
  });

  let imported = 0;

  for (const insp of inspections) {
    if (!insp.vin) continue;
    const normalized = normalizeVin(insp.vin);
    if (!normalized) continue;

    try {
      // Upsert Vehicle
      await prisma.vehicle.upsert({
        where: { vin: normalized },
        create: { vin: normalized },
        update: {},
      });

      // Upsert CarrierVehicle
      await prisma.carrierVehicle.upsert({
        where: {
          dotNumber_vin: {
            dotNumber: insp.dotNumber,
            vin: normalized,
          },
        },
        create: {
          dotNumber: insp.dotNumber,
          vin: normalized,
          source: "inspection",
          firstSeenAt: insp.inspectionDate ?? new Date(),
          lastSeenAt: insp.inspectionDate ?? new Date(),
        },
        update: {
          lastSeenAt: insp.inspectionDate ?? new Date(),
        },
      });

      imported++;
    } catch {
      // Skip on constraint violations
    }
  }

  return imported;
}
