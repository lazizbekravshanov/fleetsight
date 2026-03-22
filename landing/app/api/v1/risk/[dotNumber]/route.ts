import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { authenticateApiToken } from "@/lib/api-token";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getCarrierByDot, getInspectionsByDot, getCrashesByDot } from "@/lib/socrata";
import { getCarrierBasics, getCarrierAuthority, getCarrierOos, getCarrierProfile, extractCarrierRecord } from "@/lib/fmcsa";
import { computeRiskScore } from "@/lib/risk-score";
import type { SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";
import { parseBasics } from "@/components/carrier/shared";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  // Auth
  const tokenRow = await authenticateApiToken(req.headers.get("authorization"));
  if (!tokenRow) {
    return jsonError("Invalid or expired API token", 401);
  }

  // Check scope
  const scopes = tokenRow.scope.split(",").map((s: string) => s.trim());
  if (!scopes.includes("risk:read")) {
    return jsonError("Token missing risk:read scope", 403);
  }

  // Rate limit
  const rl = await checkApiRateLimit(`api:${tokenRow.id}`, tokenRow.tier);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) }),
      {
        status: 429,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parsed.data.dotNumber;

  // Check 15-min cache
  const cacheKey = `risk:v1:${dotNumber}`;
  const cached = await cacheGet<object>(cacheKey);
  if (cached) {
    // Log usage
    await prisma.apiKeyUsage.create({
      data: { tokenId: tokenRow.id, endpoint: "/api/v1/risk", dotNumber },
    }).catch(() => {});

    return Response.json(cached, {
      headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=900" },
    });
  }

  // Fetch carrier data
  const carrier = await getCarrierByDot(parseInt(dotNumber, 10));
  if (!carrier) {
    return jsonError("Carrier not found", 404);
  }

  const [inspections, crashes, basics, authority, oos, profile] = await Promise.all([
    getInspectionsByDot(parseInt(dotNumber, 10)).catch(() => []),
    getCrashesByDot(parseInt(dotNumber, 10)).catch(() => []),
    getCarrierBasics(dotNumber).catch(() => null),
    getCarrierAuthority(dotNumber).catch(() => null),
    getCarrierOos(dotNumber).catch(() => null),
    getCarrierProfile(dotNumber).catch(() => null),
  ]);

  // Community report summary
  const reportSummary = await prisma.communityReportSummary.findUnique({
    where: { dotNumber },
  });

  const basicScores = parseBasics(basics);
  const oosRecords: Record<string, unknown>[] = [];
  if (oos && typeof oos === "object") {
    const content = (oos as Record<string, unknown>).content;
    if (Array.isArray(content)) oosRecords.push(...content);
  }

  const riskScore = computeRiskScore({
    basicScores,
    inspections,
    crashes,
    oosRecords,
    authorityHistory: [] as SocrataAuthorityHistory[],
    mcs150Date: carrier.mcs150_date,
    addDate: carrier.add_date,
    insurance: [] as SocrataInsurance[],
    powerUnits: carrier.power_units ? parseInt(carrier.power_units, 10) : undefined,
    totalDrivers: carrier.total_drivers ? parseInt(carrier.total_drivers, 10) : undefined,
    isHazmat: carrier.hm_ind === "Y",
    communityScore: reportSummary?.communityScore,
  });

  // Extract flags from risk factors
  const flags = riskScore.factors
    .filter((f) => f.severity === "critical")
    .map((f) => ({
      id: f.category.toUpperCase().replace(/\s+/g, "_"),
      severity: f.severity,
      label: f.category,
    }));

  const response = {
    dotNumber,
    legalName: carrier.legal_name,
    grade: riskScore.grade,
    score: riskScore.score,
    flags,
    communityReportCount: reportSummary?.totalReports12m ?? 0,
    isCommunityFlagged: reportSummary?.isFlagged ?? false,
    lastUpdated: new Date().toISOString(),
  };

  // Cache for 15 minutes
  await cacheSet(cacheKey, response, 900);

  // Log usage
  await prisma.apiKeyUsage.create({
    data: { tokenId: tokenRow.id, endpoint: "/api/v1/risk", dotNumber },
  }).catch(() => {});

  return Response.json(response, {
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=900" },
  });
}
