import { prisma } from "@/lib/prisma";
import { getAffiliationsForCarrier } from "@/lib/affiliation-detection";
import { getAddressAffiliates } from "./address-clustering";
import { getPrincipalAffiliates } from "./principal-matching";

export type TrustFlag = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  detail: string;
};

export type CarrierTrustResult = {
  overallScore: number;
  grade: string;
  components: {
    identity: number;
    safety: number;
    insurance: number;
    network: number;
    operational: number;
    compliance: number;
    financial: number;
  };
  flags: TrustFlag[];
  trend: string;
};

/**
 * Compute the Carrier Trust Score — FleetSight's composite risk score
 * combining identity, safety, insurance, network, operational, compliance signals.
 *
 * Scale: 0-100 (higher = MORE trustworthy, unlike risk score where higher = worse)
 */
export async function computeTrustScore(dotNumber: number): Promise<CarrierTrustResult> {
  const flags: TrustFlag[] = [];

  // Fetch carrier data
  const carrier = await prisma.fmcsaCarrier.findUnique({
    where: { dotNumber },
    select: {
      legalName: true, statusCode: true, powerUnits: true, totalDrivers: true,
      addDate: true, priorRevokeFlag: true, priorRevokeDot: true,
      phyStreet: true, phyCity: true, phyState: true,
      companyOfficer1: true, companyOfficer2: true,
      docketPrefix: true, docketNumber: true,
    },
  });

  if (!carrier) {
    return {
      overallScore: 0, grade: "F",
      components: { identity: 0, safety: 0, insurance: 0, network: 0, operational: 0, compliance: 0, financial: 0 },
      flags: [{ id: "NOT_FOUND", severity: "critical", label: "Carrier Not Found", detail: "No FMCSA data available" }],
      trend: "UNKNOWN",
    };
  }

  // ── Identity Score (0-100) ──────────────────────────────
  let identity = 100;

  // Check for chameleon affiliations
  const affiliations = await getAffiliationsForCarrier(dotNumber).catch(() => ({
    totalVins: 0, affiliations: [], cluster: null,
  }));
  const chameleonEdges = affiliations.affiliations.filter((a) => a.type === "POSSIBLE_CHAMELEON");
  const shellEdges = affiliations.affiliations.filter((a) => a.type === "SHELL_ENTITY");

  if (chameleonEdges.length > 0) {
    identity -= 50;
    flags.push({
      id: "CHAMELEON",
      severity: "critical",
      label: "Chameleon Carrier Flag",
      detail: `Shares equipment with ${chameleonEdges.length} carrier(s) in pattern consistent with chameleon reincarnation`,
    });
  }
  if (shellEdges.length > 0) {
    identity -= 30;
    flags.push({
      id: "SHELL_ENTITY",
      severity: "high",
      label: "Possible Shell Entity",
      detail: `High concurrent equipment overlap with ${shellEdges.length} other carrier(s)`,
    });
  }
  if (carrier.priorRevokeFlag === "Y") {
    identity -= 20;
    flags.push({
      id: "PRIOR_REVOKE",
      severity: "high",
      label: "Prior Authority Revocation",
      detail: carrier.priorRevokeDot ? `Previously operated as DOT ${carrier.priorRevokeDot}` : "Has prior revoked authority",
    });
  }

  // Check shared principals
  const principals = await getPrincipalAffiliates(dotNumber).catch(() => ({
    officers: [], sharedPrincipals: [],
  }));
  if (principals.sharedPrincipals.length > 0) {
    const totalLinked = principals.sharedPrincipals.reduce((s, p) => s + p.dotNumbers.length, 0);
    if (totalLinked > 5) {
      identity -= 15;
      flags.push({
        id: "PRINCIPAL_NETWORK",
        severity: "medium",
        label: "Large Principal Network",
        detail: `Officers linked to ${totalLinked} other carriers`,
      });
    }
  }

  identity = Math.max(0, identity);

  // ── Safety Score (0-100) ────────────────────────────────
  // Based on existing risk score if available
  const riskScore = await prisma.carrierRiskScore.findUnique({
    where: { dotNumber },
  });

  let safety = 70; // default if no data
  if (riskScore) {
    // Invert: risk compositeScore 0-100 where 100=bad → trust 100-compositeScore
    safety = Math.max(0, 100 - Math.round(riskScore.compositeScore));
  }

  // ── Insurance Score (0-100) ─────────────────────────────
  let insurance = 80; // default (assume ok if no data)
  // Will be enriched when we have insurance history data

  // ── Network Score (0-100) ───────────────────────────────
  let network = 100;
  const clusterSize = affiliations.cluster?.members.length ?? 0;

  if (clusterSize > 10) {
    network -= 30;
    flags.push({
      id: "LARGE_CLUSTER",
      severity: "medium",
      label: "Large Affiliation Cluster",
      detail: `Part of a network of ${clusterSize} interconnected carriers`,
    });
  } else if (clusterSize > 5) {
    network -= 15;
  }

  // Penalize for high-risk affiliates
  const highRiskAffiliates = affiliations.affiliations.filter((a) => a.score >= 60);
  if (highRiskAffiliates.length > 0) {
    network -= Math.min(40, highRiskAffiliates.length * 15);
  }

  network = Math.max(0, network);

  // ── Operational Score (0-100) ───────────────────────────
  let operational = 70;

  // Double-broker signal: has MC but near-zero fleet
  const hasMC = !!carrier.docketNumber;
  const powerUnits = carrier.powerUnits ?? 0;
  const drivers = carrier.totalDrivers ?? 0;

  if (hasMC && powerUnits <= 1 && drivers <= 1) {
    operational -= 30;
    flags.push({
      id: "POSSIBLE_DOUBLE_BROKER",
      severity: "high",
      label: "Possible Double Broker",
      detail: "Holds MC authority but reports 0-1 power units and drivers",
    });
  }

  if (powerUnits === 0 && drivers === 0) {
    operational -= 20;
    flags.push({
      id: "NO_FLEET",
      severity: "medium",
      label: "No Registered Fleet",
      detail: "Reports zero power units and zero drivers",
    });
  }

  // Driver-to-truck ratio check
  if (powerUnits > 0 && drivers > 0) {
    const ratio = drivers / powerUnits;
    if (ratio > 3) {
      operational -= 10; // too many drivers per truck
    } else if (ratio < 0.5) {
      operational -= 10; // not enough drivers for fleet
    }
  }

  operational = Math.max(0, operational);

  // ── Compliance Score (0-100) ────────────────────────────
  let compliance = 80;

  // Authority age
  if (carrier.addDate) {
    const days = (Date.now() - carrier.addDate.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 90) {
      compliance -= 20;
      flags.push({
        id: "NEW_AUTHORITY",
        severity: "medium",
        label: "New Authority",
        detail: `Authority granted ${Math.round(days)} days ago`,
      });
    } else if (days < 180) {
      compliance -= 10;
    }
  }

  // Status
  if (carrier.statusCode !== "A") {
    compliance -= 40;
    flags.push({
      id: "INACTIVE",
      severity: "critical",
      label: "Inactive Status",
      detail: `Carrier status: ${carrier.statusCode}`,
    });
  }

  compliance = Math.max(0, compliance);

  // ── Financial Score (0-100) ─────────────────────────────
  const financial = 70; // Default — will improve with community reports + complaint data

  // Check community reports
  const reportSummary = await prisma.communityReportSummary.findUnique({
    where: { dotNumber: String(dotNumber) },
  }).catch(() => null);

  let financialAdj = financial;
  if (reportSummary && reportSummary.isFlagged) {
    financialAdj -= 30;
    flags.push({
      id: "COMMUNITY_FLAGGED",
      severity: "high",
      label: "Community Flagged",
      detail: `${reportSummary.totalReports12m} community reports in last 12 months`,
    });
  }
  financialAdj = Math.max(0, financialAdj);

  // ── Composite ───────────────────────────────────────────
  const components = {
    identity,
    safety,
    insurance,
    network,
    operational,
    compliance,
    financial: financialAdj,
  };

  const overallScore = Math.round(
    identity * 0.20 +
    safety * 0.25 +
    insurance * 0.15 +
    network * 0.10 +
    operational * 0.10 +
    compliance * 0.10 +
    financialAdj * 0.10
  );

  const grade =
    overallScore >= 80 ? "A" :
    overallScore >= 60 ? "B" :
    overallScore >= 40 ? "C" :
    overallScore >= 20 ? "D" : "F";

  // Trend (simplified — would need historical data for real trend)
  const trend = overallScore >= 60 ? "STABLE" : overallScore >= 40 ? "DECLINING" : "RAPIDLY_DECLINING";

  return { overallScore, grade, components, flags, trend };
}
