import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getAffiliationsForCarrier } from "@/lib/affiliation-detection";
import { getAddressAffiliates } from "@/lib/graph/address-clustering";
import { getPrincipalAffiliates } from "@/lib/graph/principal-matching";
import { prisma } from "@/lib/prisma";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

/**
 * GET /api/carrier/:dot/network
 * Returns the full graph neighborhood: VIN affiliations, address co-location,
 * shared principals, and phone matches.
 */
export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  // Parallel: all network signals
  const [vinAffiliations, addressData, principalData, phoneMatches] = await Promise.all([
    getAffiliationsForCarrier(dotNumber).catch(() => ({
      totalVins: 0, affiliations: [], cluster: null,
    })),
    getAddressAffiliates(dotNumber).catch(() => ({
      address: null, coLocatedCarriers: [],
    })),
    getPrincipalAffiliates(dotNumber).catch(() => ({
      officers: [], sharedPrincipals: [],
    })),
    findPhoneMatches(dotNumber),
  ]);

  // Collect all unique connected DOTs
  const connectedDots = new Set<number>();
  for (const a of vinAffiliations.affiliations) connectedDots.add(a.dotNumber);
  for (const c of addressData.coLocatedCarriers) connectedDots.add(c.dotNumber);
  for (const p of principalData.sharedPrincipals) {
    for (const d of p.dotNumbers) connectedDots.add(d);
  }
  for (const pm of phoneMatches) connectedDots.add(pm.dotNumber);

  return Response.json({
    dotNumber,
    totalConnections: connectedDots.size,

    vinAffiliations: {
      count: vinAffiliations.affiliations.length,
      totalSharedVins: vinAffiliations.totalVins,
      cluster: vinAffiliations.cluster,
      carriers: vinAffiliations.affiliations.map((a) => ({
        dotNumber: a.dotNumber,
        legalName: a.legalName,
        score: a.score,
        type: a.type,
        sharedVinCount: a.sharedVinCount,
        topReason: a.reasons[0] ?? null,
      })),
    },

    addressAffiliations: {
      address: addressData.address,
      count: addressData.coLocatedCarriers.length,
      carriers: addressData.coLocatedCarriers,
    },

    principalAffiliations: {
      officers: principalData.officers,
      count: principalData.sharedPrincipals.length,
      clusters: principalData.sharedPrincipals.map((p) => ({
        name: p.nameNormalized,
        carriers: p.carriers,
      })),
    },

    phoneAffiliations: {
      count: phoneMatches.length,
      carriers: phoneMatches,
    },
  });
}

async function findPhoneMatches(dotNumber: number) {
  const carrier = await prisma.fmcsaCarrier.findUnique({
    where: { dotNumber },
    select: { phone: true },
  });

  if (!carrier?.phone) return [];

  const matches = await prisma.fmcsaCarrier.findMany({
    where: { phone: carrier.phone, dotNumber: { not: dotNumber } },
    select: { dotNumber: true, legalName: true, statusCode: true },
    take: 50,
  });

  return matches;
}
