import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { normalizeVin } from "@/lib/vin-utils";
import { UnionFind } from "@/lib/union-find";
import {
  computeAffiliationScore,
  computeVinTemporal,
  nameSimilarity,
  type SharedVinDetail,
  type AffiliationType,
  type SignalBreakdown,
} from "@/lib/affiliation-scoring";

/* ── Types ──────────────────────────────────────────────────────── */

export type AffiliationResult = {
  dotNumber: number;
  legalName: string | null;
  statusCode: string | null;
  sharedVinCount: number;
  sharedVins: SharedVinDetail[];
  score: number;
  type: AffiliationType;
  signals: SignalBreakdown;
  reasons: string[];
  clusterId: string | null;
};

/* ── Per-carrier affiliation lookup ─────────────────────────────── */

export async function getAffiliationsForCarrier(
  dotNumber: number
): Promise<{
  totalVins: number;
  affiliations: AffiliationResult[];
  cluster: { id: string; members: number[] } | null;
}> {
  // Get this carrier's VIN registrations
  const myVehicles = await prisma.carrierVehicle.findMany({
    where: { dotNumber },
    select: { vin: true, firstSeenAt: true, lastSeenAt: true, unitType: true },
  });

  if (myVehicles.length === 0) {
    return { totalVins: 0, affiliations: [], cluster: null };
  }

  const myVins = myVehicles.map((v) => v.vin);
  const myVinMap = new Map(
    myVehicles.map((v) => [v.vin, { first: v.firstSeenAt, last: v.lastSeenAt, type: v.unitType }])
  );

  // Find other carriers sharing these VINs
  const sharedRecords = await prisma.carrierVehicle.findMany({
    where: { vin: { in: myVins }, dotNumber: { not: dotNumber } },
    select: { dotNumber: true, vin: true, firstSeenAt: true, lastSeenAt: true, unitType: true },
  });

  if (sharedRecords.length === 0) {
    return { totalVins: myVins.length, affiliations: [], cluster: null };
  }

  // Group by other carrier
  const carrierVinMap = new Map<
    number,
    { vin: string; firstSeenAt: Date; lastSeenAt: Date; unitType: string }[]
  >();
  for (const rec of sharedRecords) {
    const list = carrierVinMap.get(rec.dotNumber) ?? [];
    list.push(rec);
    carrierVinMap.set(rec.dotNumber, list);
  }

  // Fetch carrier metadata
  const otherDots = [...carrierVinMap.keys()];
  const [carriers, myCarrier, otherVinCounts] = await Promise.all([
    prisma.fmcsaCarrier.findMany({
      where: { dotNumber: { in: otherDots } },
      select: {
        dotNumber: true, legalName: true, statusCode: true,
        phyStreet: true, phyCity: true, phyState: true,
        addDate: true, powerUnits: true,
      },
    }),
    prisma.fmcsaCarrier.findUnique({
      where: { dotNumber },
      select: {
        legalName: true, statusCode: true,
        phyStreet: true, phyCity: true, phyState: true,
        addDate: true, powerUnits: true,
      },
    }),
    prisma.carrierVehicle.groupBy({
      by: ["dotNumber"],
      where: { dotNumber: { in: otherDots } },
      _count: true,
    }),
  ]);

  const carrierMap = new Map(carriers.map((c) => [c.dotNumber, c]));
  const vinCountMap = new Map(otherVinCounts.map((v) => [v.dotNumber, v._count]));

  // Check cluster membership
  const clusterRow = await prisma.affiliationCluster.findFirst({
    where: { dotNumbers: { contains: String(dotNumber) } },
  });
  const cluster = clusterRow
    ? { id: clusterRow.clusterId, members: clusterRow.dotNumbers.split(",").map(Number) }
    : null;

  // Score each affiliated carrier
  const affiliations: AffiliationResult[] = [];

  for (const [otherDot, records] of carrierVinMap) {
    const other = carrierMap.get(otherDot);
    const otherTotalVins = vinCountMap.get(otherDot) ?? records.length;

    // Build SharedVinDetail for temporal analysis
    const sharedVins: SharedVinDetail[] = records.map((rec) => {
      const myVin = myVinMap.get(rec.vin);
      const temporal = computeVinTemporal(
        myVin?.first ?? null,
        myVin?.last ?? null,
        rec.firstSeenAt,
        rec.lastSeenAt
      );
      return {
        vin: rec.vin,
        vehicleType: rec.unitType,
        unitMake: null,
        unitYear: null,
        carrierAFirstSeen: myVin?.first ?? null,
        carrierALastSeen: myVin?.last ?? null,
        carrierBFirstSeen: rec.firstSeenAt,
        carrierBLastSeen: rec.lastSeenAt,
        overlapDays: temporal.overlapDays,
        gapDays: temporal.gapDays,
        transferDirection: temporal.transferDirection as SharedVinDetail["transferDirection"],
      };
    });

    const result = computeAffiliationScore({
      sharedVins,
      totalVinsA: myVins.length,
      totalVinsB: otherTotalVins,
      powerUnitsA: myCarrier?.powerUnits ?? null,
      powerUnitsB: other?.powerUnits ?? null,
      samePhysicalAddress:
        !!myCarrier?.phyStreet && !!other?.phyStreet &&
        myCarrier.phyStreet.toUpperCase() === other.phyStreet.toUpperCase() &&
        myCarrier.phyCity?.toUpperCase() === other.phyCity?.toUpperCase(),
      sameCityState:
        !!myCarrier?.phyCity && !!other?.phyCity &&
        myCarrier.phyCity.toUpperCase() === other.phyCity.toUpperCase() &&
        myCarrier.phyState === other.phyState,
      sameState: myCarrier?.phyState === other?.phyState,
      nameSimilarityScore: nameSimilarity(myCarrier?.legalName ?? "", other?.legalName ?? ""),
      carrierAStatus: myCarrier?.statusCode ?? null,
      carrierBStatus: other?.statusCode ?? null,
      carrierAOosDate: null,
      carrierBOosDate: null,
      carrierAAddDate: myCarrier?.addDate ?? null,
      carrierBAddDate: other?.addDate ?? null,
    });

    affiliations.push({
      dotNumber: otherDot,
      legalName: other?.legalName ?? null,
      statusCode: other?.statusCode ?? null,
      sharedVinCount: records.length,
      sharedVins,
      score: result.score,
      type: result.type,
      signals: result.signals,
      reasons: result.reasons,
      clusterId: cluster?.id ?? null,
    });
  }

  affiliations.sort((a, b) => b.score - a.score);

  return { totalVins: myVins.length, affiliations, cluster };
}

/* ── VIN detail lookup ──────────────────────────────────────────── */

export async function getVinCarriers(vin: string) {
  const records = await prisma.carrierVehicle.findMany({
    where: { vin },
    include: {
      vehicle: true,
      carrier: { select: { dotNumber: true, legalName: true, statusCode: true } },
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
      ? { vin: r.vehicle.vin, make: r.vehicle.make, model: r.vehicle.model, modelYear: r.vehicle.modelYear }
      : null,
  }));
}

/* ── Full detection pipeline ────────────────────────────────────── */

export async function runDetectionPipeline(): Promise<{
  observations: number;
  sharedVinPairs: number;
  clusters: number;
  edges: number;
  chameleons: number;
}> {
  // Step 1: Find all VINs shared between carriers via self-join
  const pairs = await prisma.$queryRaw<
    { dotA: number; dotB: number; sharedCount: number; vins: string }[]
  >(Prisma.sql`
    SELECT
      a."dotNumber" AS "dotA",
      b."dotNumber" AS "dotB",
      COUNT(DISTINCT a.vin)::int AS "sharedCount",
      STRING_AGG(DISTINCT a.vin, ',') AS vins
    FROM "CarrierVehicle" a
    JOIN "CarrierVehicle" b
      ON a.vin = b.vin AND a."dotNumber" < b."dotNumber"
    GROUP BY a."dotNumber", b."dotNumber"
    HAVING COUNT(DISTINCT a.vin) >= 1
    ORDER BY "sharedCount" DESC
  `);

  if (pairs.length === 0) {
    return { observations: 0, sharedVinPairs: 0, clusters: 0, edges: 0, chameleons: 0 };
  }

  // Step 2: Union-Find clustering
  const uf = new UnionFind();
  for (const pair of pairs) {
    uf.makeSet(String(pair.dotA));
    uf.makeSet(String(pair.dotB));
    uf.union(String(pair.dotA), String(pair.dotB));
  }

  const clusters = uf.getClusters();

  // Step 3: Persist clusters
  for (const [root, members] of clusters) {
    const dotNumbers = members.join(",");
    await prisma.affiliationCluster.upsert({
      where: { clusterId: root },
      create: { clusterId: root, memberCount: members.length, dotNumbers },
      update: { memberCount: members.length, dotNumbers },
    });
  }

  // Step 4: Score each pair with temporal analysis
  let chameleons = 0;

  for (const pair of pairs) {
    const sharedVins = pair.vins.split(",");
    const clusterId = uf.find(String(pair.dotA));

    // Get temporal data for each shared VIN
    const [aRecords, bRecords, carrierA, carrierB] = await Promise.all([
      prisma.carrierVehicle.findMany({
        where: { dotNumber: pair.dotA, vin: { in: sharedVins } },
        select: { vin: true, firstSeenAt: true, lastSeenAt: true, unitType: true },
      }),
      prisma.carrierVehicle.findMany({
        where: { dotNumber: pair.dotB, vin: { in: sharedVins } },
        select: { vin: true, firstSeenAt: true, lastSeenAt: true, unitType: true },
      }),
      prisma.fmcsaCarrier.findUnique({
        where: { dotNumber: pair.dotA },
        select: { legalName: true, statusCode: true, phyStreet: true, phyCity: true, phyState: true, addDate: true, powerUnits: true },
      }),
      prisma.fmcsaCarrier.findUnique({
        where: { dotNumber: pair.dotB },
        select: { legalName: true, statusCode: true, phyStreet: true, phyCity: true, phyState: true, addDate: true, powerUnits: true },
      }),
    ]);

    const aMap = new Map(aRecords.map((r) => [r.vin, r]));
    const bMap = new Map(bRecords.map((r) => [r.vin, r]));

    const vinDetails: SharedVinDetail[] = sharedVins.map((vin) => {
      const a = aMap.get(vin);
      const b = bMap.get(vin);
      const temporal = computeVinTemporal(
        a?.firstSeenAt ?? null, a?.lastSeenAt ?? null,
        b?.firstSeenAt ?? null, b?.lastSeenAt ?? null
      );
      return {
        vin,
        vehicleType: a?.unitType ?? b?.unitType ?? "TRUCK",
        unitMake: null,
        unitYear: null,
        carrierAFirstSeen: a?.firstSeenAt ?? null,
        carrierALastSeen: a?.lastSeenAt ?? null,
        carrierBFirstSeen: b?.firstSeenAt ?? null,
        carrierBLastSeen: b?.lastSeenAt ?? null,
        ...temporal,
        transferDirection: temporal.transferDirection as SharedVinDetail["transferDirection"],
      };
    });

    const [countA, countB] = await Promise.all([
      prisma.carrierVehicle.count({ where: { dotNumber: pair.dotA } }),
      prisma.carrierVehicle.count({ where: { dotNumber: pair.dotB } }),
    ]);

    const result = computeAffiliationScore({
      sharedVins: vinDetails,
      totalVinsA: countA,
      totalVinsB: countB,
      powerUnitsA: carrierA?.powerUnits ?? null,
      powerUnitsB: carrierB?.powerUnits ?? null,
      samePhysicalAddress:
        !!carrierA?.phyStreet && !!carrierB?.phyStreet &&
        carrierA.phyStreet.toUpperCase() === carrierB.phyStreet.toUpperCase() &&
        carrierA.phyCity?.toUpperCase() === carrierB.phyCity?.toUpperCase(),
      sameCityState:
        !!carrierA?.phyCity && !!carrierB?.phyCity &&
        carrierA.phyCity.toUpperCase() === carrierB.phyCity.toUpperCase() &&
        carrierA.phyState === carrierB?.phyState,
      sameState: carrierA?.phyState === carrierB?.phyState,
      nameSimilarityScore: nameSimilarity(carrierA?.legalName ?? "", carrierB?.legalName ?? ""),
      carrierAStatus: carrierA?.statusCode ?? null,
      carrierBStatus: carrierB?.statusCode ?? null,
      carrierAOosDate: null,
      carrierBOosDate: null,
      carrierAAddDate: carrierA?.addDate ?? null,
      carrierBAddDate: carrierB?.addDate ?? null,
    });

    if (result.type === "POSSIBLE_CHAMELEON") chameleons++;

    // Upsert edge
    const edge = await prisma.carrierAffiliation.upsert({
      where: { dotNumberA_dotNumberB: { dotNumberA: pair.dotA, dotNumberB: pair.dotB } },
      create: {
        clusterId,
        dotNumberA: pair.dotA,
        dotNumberB: pair.dotB,
        sharedVinCount: pair.sharedCount,
        affiliationScore: result.score,
        affiliationType: result.type,
        sharedVinsJson: JSON.stringify(sharedVins),
        sigVinRatio: result.signals.sharedVinRatio,
        sigTemporal: result.signals.temporalPattern,
        sigConcurrent: result.signals.concurrentOps,
        sigAddress: result.signals.addressMatch,
        sigName: result.signals.nameMatch,
        sigOosReincarnation: result.signals.oosReincarnation,
        sigFleetAbsorption: result.signals.fleetAbsorption,
        reasonsJson: JSON.stringify(result.reasons),
        flagged: result.type === "POSSIBLE_CHAMELEON" || result.type === "SHELL_ENTITY",
      },
      update: {
        clusterId,
        sharedVinCount: pair.sharedCount,
        affiliationScore: result.score,
        affiliationType: result.type,
        sharedVinsJson: JSON.stringify(sharedVins),
        sigVinRatio: result.signals.sharedVinRatio,
        sigTemporal: result.signals.temporalPattern,
        sigConcurrent: result.signals.concurrentOps,
        sigAddress: result.signals.addressMatch,
        sigName: result.signals.nameMatch,
        sigOosReincarnation: result.signals.oosReincarnation,
        sigFleetAbsorption: result.signals.fleetAbsorption,
        reasonsJson: JSON.stringify(result.reasons),
        flagged: result.type === "POSSIBLE_CHAMELEON" || result.type === "SHELL_ENTITY",
      },
    });

    // Persist per-VIN temporal details
    for (const vd of vinDetails) {
      await prisma.affiliationEdgeVin.upsert({
        where: { edgeId_vin: { edgeId: edge.id, vin: vd.vin } },
        create: {
          edgeId: edge.id,
          vin: vd.vin,
          vehicleType: vd.vehicleType,
          dotAFirstSeen: vd.carrierAFirstSeen,
          dotALastSeen: vd.carrierALastSeen,
          dotBFirstSeen: vd.carrierBFirstSeen,
          dotBLastSeen: vd.carrierBLastSeen,
          overlapDays: vd.overlapDays,
          gapDays: vd.gapDays,
          transferDirection: vd.transferDirection,
        },
        update: {
          dotAFirstSeen: vd.carrierAFirstSeen,
          dotALastSeen: vd.carrierALastSeen,
          dotBFirstSeen: vd.carrierBFirstSeen,
          dotBLastSeen: vd.carrierBLastSeen,
          overlapDays: vd.overlapDays,
          gapDays: vd.gapDays,
          transferDirection: vd.transferDirection,
        },
      });
    }

    // Update cluster max score
    await prisma.affiliationCluster.update({
      where: { clusterId },
      data: {
        maxScore: { set: Math.max(result.score) },
        worstType: result.type === "POSSIBLE_CHAMELEON" ? "POSSIBLE_CHAMELEON" : undefined,
      },
    });
  }

  const totalObs = await prisma.vinObservation.count();

  return {
    observations: totalObs,
    sharedVinPairs: pairs.length,
    clusters: clusters.size,
    edges: pairs.length,
    chameleons,
  };
}

/* ── VIN observation ingestion ──────────────────────────────────── */

export async function ingestVinObservations(
  observations: {
    vin: string;
    dotNumber: number;
    inspectionDate: Date;
    inspectionId?: string;
    state?: string;
    vehicleType?: string;
    unitMake?: string;
    unitYear?: number;
  }[]
): Promise<{ ingested: number; skipped: number }> {
  let ingested = 0;
  let skipped = 0;

  for (const obs of observations) {
    const normalized = normalizeVin(obs.vin);
    if (!normalized) { skipped++; continue; }

    try {
      // Insert observation (append-only event log)
      await prisma.vinObservation.upsert({
        where: {
          vin_dotNumber_inspectionDate: {
            vin: normalized,
            dotNumber: obs.dotNumber,
            inspectionDate: obs.inspectionDate,
          },
        },
        create: {
          vin: normalized,
          dotNumber: obs.dotNumber,
          inspectionDate: obs.inspectionDate,
          inspectionId: obs.inspectionId,
          state: obs.state,
          vehicleType: obs.vehicleType ?? "TRUCK",
          unitMake: obs.unitMake,
          unitYear: obs.unitYear,
        },
        update: {},
      });

      // Upsert Vehicle
      await prisma.vehicle.upsert({
        where: { vin: normalized },
        create: {
          vin: normalized,
          make: obs.unitMake,
          modelYear: obs.unitYear,
          vehicleType: obs.vehicleType,
        },
        update: {
          make: obs.unitMake ?? undefined,
          modelYear: obs.unitYear ?? undefined,
        },
      });

      // Upsert CarrierVehicle (aggregated view)
      await prisma.carrierVehicle.upsert({
        where: { dotNumber_vin: { dotNumber: obs.dotNumber, vin: normalized } },
        create: {
          dotNumber: obs.dotNumber,
          vin: normalized,
          unitType: obs.vehicleType ?? "TRUCK",
          source: "MCMIS",
          firstSeenAt: obs.inspectionDate,
          lastSeenAt: obs.inspectionDate,
          observationCount: 1,
        },
        update: {
          lastSeenAt: obs.inspectionDate,
          observationCount: { increment: 1 },
        },
      });

      ingested++;
    } catch {
      skipped++;
    }
  }

  return { ingested, skipped };
}

/** Populate from existing FmcsaInspection VINs. */
export async function populateVehiclesFromInspections(): Promise<number> {
  const inspections = await prisma.fmcsaInspection.findMany({
    where: { vin: { not: null } },
    select: { dotNumber: true, vin: true, inspectionDate: true },
  });

  const obs = inspections
    .filter((i) => i.vin)
    .map((i) => ({
      vin: i.vin!,
      dotNumber: i.dotNumber,
      inspectionDate: i.inspectionDate ?? new Date(),
    }));

  const { ingested } = await ingestVinObservations(obs);
  return ingested;
}
