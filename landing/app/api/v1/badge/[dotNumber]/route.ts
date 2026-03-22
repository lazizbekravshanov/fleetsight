import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateApiToken } from "@/lib/api-token";
import { checkApiRateLimit } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet } from "@/lib/cache";
import { getCarrierByDot } from "@/lib/socrata";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { generateBadgeSvg } from "@/lib/badge-svg";

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
  // Auth — Bearer token or proceed with IP-based limiting
  const tokenRow = await authenticateApiToken(req.headers.get("authorization"));
  const tier = tokenRow?.tier ?? "free";
  const identifier = tokenRow ? `api:${tokenRow.id}` : `ip:${req.headers.get("x-forwarded-for") ?? "unknown"}`;

  const rl = await checkApiRateLimit(identifier, tier);
  if (!rl.allowed) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        ...CORS_HEADERS,
        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    });
  }

  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return new Response("Invalid USDOT number", { status: 400, headers: CORS_HEADERS });
  }

  const dotNumber = parsed.data.dotNumber;

  // Check cache
  const cacheKey = `badge:v1:${dotNumber}`;
  const cached = await cacheGet<string>(cacheKey);
  if (cached) {
    if (tokenRow) {
      await prisma.apiKeyUsage.create({
        data: { tokenId: tokenRow.id, endpoint: "/api/v1/badge", dotNumber },
      }).catch(() => {});
    }
    return new Response(cached, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=900",
      },
    });
  }

  const carrier = await getCarrierByDot(parseInt(dotNumber, 10));
  if (!carrier) {
    return new Response("Carrier not found", { status: 404, headers: CORS_HEADERS });
  }

  const risk = computeQuickRiskIndicator({
    powerUnits: carrier.power_units ? parseInt(carrier.power_units, 10) : undefined,
    totalDrivers: carrier.total_drivers ? parseInt(carrier.total_drivers, 10) : undefined,
    addDate: carrier.add_date,
    mcs150Date: carrier.mcs150_date,
    statusCode: carrier.status_code,
  });

  const svg = generateBadgeSvg(risk.grade, risk.score, carrier.legal_name);
  await cacheSet(cacheKey, svg, 900);

  if (tokenRow) {
    await prisma.apiKeyUsage.create({
      data: { tokenId: tokenRow.id, endpoint: "/api/v1/badge", dotNumber },
    }).catch(() => {});
  }

  return new Response(svg, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=900",
    },
  });
}
