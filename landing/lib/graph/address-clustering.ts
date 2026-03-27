import { prisma } from "@/lib/prisma";
import { normalizeAddress } from "./normalize";

export type AddressCluster = {
  normalized: string;
  city: string | null;
  state: string | null;
  dotNumbers: number[];
  carrierCount: number;
};

/**
 * Populate CarrierAddress table from FmcsaCarrier data.
 * Extracts and normalizes physical + mailing addresses.
 */
export async function populateAddresses(): Promise<number> {
  const carriers = await prisma.fmcsaCarrier.findMany({
    select: {
      dotNumber: true,
      phyStreet: true,
      phyCity: true,
      phyState: true,
      phyZip: true,
    },
  });

  let count = 0;
  for (const c of carriers) {
    if (!c.phyStreet || !c.phyCity || !c.phyState) continue;

    const normalized = normalizeAddress(c.phyStreet, c.phyCity, c.phyState, c.phyZip ?? undefined);

    try {
      await prisma.carrierAddress.upsert({
        where: { id: `addr_${c.dotNumber}_PHYSICAL` },
        create: {
          id: `addr_${c.dotNumber}_PHYSICAL`,
          dotNumber: c.dotNumber,
          addressType: "PHYSICAL",
          rawAddress: `${c.phyStreet}, ${c.phyCity}, ${c.phyState} ${c.phyZip ?? ""}`.trim(),
          normalized,
          city: c.phyCity,
          state: c.phyState,
          zip: c.phyZip,
        },
        update: {
          rawAddress: `${c.phyStreet}, ${c.phyCity}, ${c.phyState} ${c.phyZip ?? ""}`.trim(),
          normalized,
          city: c.phyCity,
          state: c.phyState,
          zip: c.phyZip,
        },
      });
      count++;
    } catch {
      // skip
    }
  }

  return count;
}

/**
 * Find all addresses shared by 2+ carriers.
 */
export async function findAddressClusters(): Promise<AddressCluster[]> {
  const groups = await prisma.carrierAddress.groupBy({
    by: ["normalized", "city", "state"],
    where: { addressType: "PHYSICAL" },
    _count: true,
    having: { normalized: { _count: { gt: 1 } } },
    orderBy: { _count: { normalized: "desc" } },
  });

  const results: AddressCluster[] = [];

  for (const g of groups) {
    const addresses = await prisma.carrierAddress.findMany({
      where: { normalized: g.normalized, addressType: "PHYSICAL" },
      select: { dotNumber: true },
    });

    results.push({
      normalized: g.normalized,
      city: g.city,
      state: g.state,
      dotNumbers: addresses.map((a) => a.dotNumber),
      carrierCount: addresses.length,
    });
  }

  return results;
}

/**
 * Get carriers sharing an address with a specific DOT number.
 */
export async function getAddressAffiliates(dotNumber: number): Promise<{
  address: string | null;
  coLocatedCarriers: { dotNumber: number; legalName: string | null }[];
}> {
  const myAddress = await prisma.carrierAddress.findFirst({
    where: { dotNumber, addressType: "PHYSICAL" },
  });

  if (!myAddress) return { address: null, coLocatedCarriers: [] };

  const coLocated = await prisma.carrierAddress.findMany({
    where: {
      normalized: myAddress.normalized,
      addressType: "PHYSICAL",
      dotNumber: { not: dotNumber },
    },
    select: { dotNumber: true },
  });

  const carriers = await prisma.fmcsaCarrier.findMany({
    where: { dotNumber: { in: coLocated.map((c) => c.dotNumber) } },
    select: { dotNumber: true, legalName: true },
  });

  return {
    address: myAddress.rawAddress,
    coLocatedCarriers: carriers,
  };
}
