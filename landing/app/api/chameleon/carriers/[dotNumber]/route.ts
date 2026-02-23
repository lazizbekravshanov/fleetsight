import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { getCarrierByDot } from "@/lib/socrata";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  // Try local DB first
  const carrier = await prisma.fmcsaCarrier.findUnique({
    where: { dotNumber },
    include: {
      riskScore: true,
      crashes: { orderBy: { reportDate: "desc" }, take: 50 },
      inspections: { where: { vin: { not: null } }, take: 100, orderBy: { inspectionDate: "desc" } },
    },
  });

  if (carrier) {
    // Get links involving this carrier
    const links = await prisma.carrierLink.findMany({
      where: {
        OR: [{ dotNumberA: dotNumber }, { dotNumberB: dotNumber }],
      },
      orderBy: { score: "desc" },
      take: 50,
    });

    // Resolve linked carrier names
    const linkedDots = new Set<number>();
    for (const link of links) {
      linkedDots.add(link.dotNumberA === dotNumber ? link.dotNumberB : link.dotNumberA);
    }

    const linkedCarriers = linkedDots.size > 0
      ? await prisma.fmcsaCarrier.findMany({
          where: { dotNumber: { in: Array.from(linkedDots) } },
          select: { dotNumber: true, legalName: true, statusCode: true },
        })
      : [];

    const nameMap = new Map(linkedCarriers.map((c) => [c.dotNumber, c]));

    const enrichedLinks = links.map((link) => {
      const otherDot = link.dotNumberA === dotNumber ? link.dotNumberB : link.dotNumberA;
      const other = nameMap.get(otherDot);
      return {
        otherDotNumber: otherDot,
        otherLegalName: other?.legalName ?? "Unknown",
        otherStatusCode: other?.statusCode ?? null,
        score: link.score,
        reasons: JSON.parse(link.reasonsJson),
      };
    });

    // Get cluster membership
    const clusterMembership = await prisma.clusterMember.findFirst({
      where: { dotNumber },
      include: {
        cluster: {
          include: { members: { include: { carrier: { select: { dotNumber: true, legalName: true, statusCode: true } } } } },
        },
      },
    });

    const clusterMembers = clusterMembership?.cluster.members.map((m) => ({
      dotNumber: m.carrier.dotNumber,
      legalName: m.carrier.legalName,
      statusCode: m.carrier.statusCode,
    })) ?? [];

    return Response.json({
      carrier: {
        dotNumber: carrier.dotNumber,
        legalName: carrier.legalName,
        dbaName: carrier.dbaName,
        phyStreet: carrier.phyStreet,
        phyCity: carrier.phyCity,
        phyState: carrier.phyState,
        phyZip: carrier.phyZip,
        phone: carrier.phone,
        statusCode: carrier.statusCode,
        priorRevokeFlag: carrier.priorRevokeFlag,
        priorRevokeDot: carrier.priorRevokeDot,
        addDate: carrier.addDate,
        powerUnits: carrier.powerUnits,
        totalDrivers: carrier.totalDrivers,
        companyOfficer1: carrier.companyOfficer1,
        companyOfficer2: carrier.companyOfficer2,
      },
      riskScore: carrier.riskScore
        ? {
            chameleonScore: carrier.riskScore.chameleonScore,
            safetyScore: carrier.riskScore.safetyScore,
            compositeScore: carrier.riskScore.compositeScore,
            signals: JSON.parse(carrier.riskScore.signalsJson),
            clusterSize: carrier.riskScore.clusterSize,
          }
        : null,
      crashes: carrier.crashes.map((c) => ({
        reportDate: c.reportDate,
        reportNumber: c.reportNumber,
        state: c.state,
        fatalities: c.fatalities,
        injuries: c.injuries,
        towAway: c.towAway,
      })),
      links: enrichedLinks,
      clusterMembers,
    });
  }

  // Not in local DB — fall back to Socrata API
  const socrataCarrier = await getCarrierByDot(dotNumber);
  if (!socrataCarrier) {
    return jsonError("Carrier not found", 404);
  }

  return Response.json({
    carrier: {
      dotNumber: parseInt(socrataCarrier.dot_number, 10),
      legalName: socrataCarrier.legal_name ?? "",
      dbaName: socrataCarrier.dba_name ?? null,
      phyStreet: socrataCarrier.phy_street ?? null,
      phyCity: socrataCarrier.phy_city ?? null,
      phyState: socrataCarrier.phy_state ?? null,
      phyZip: socrataCarrier.phy_zip ?? null,
      phone: socrataCarrier.phone ?? null,
      statusCode: socrataCarrier.status_code ?? null,
      priorRevokeFlag: socrataCarrier.prior_revoke_flag ?? null,
      priorRevokeDot: socrataCarrier.prior_revoke_dot ? parseInt(socrataCarrier.prior_revoke_dot, 10) : null,
      addDate: socrataCarrier.add_date ?? null,
      powerUnits: socrataCarrier.power_units ? parseInt(socrataCarrier.power_units, 10) : null,
      totalDrivers: socrataCarrier.total_drivers ? parseInt(socrataCarrier.total_drivers, 10) : null,
      companyOfficer1: socrataCarrier.company_officer_1 ?? null,
      companyOfficer2: socrataCarrier.company_officer_2 ?? null,
    },
    riskScore: null,
    crashes: [],
    links: [],
    clusterMembers: [],
  });
}
