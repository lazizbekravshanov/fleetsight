import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { searchCarriers, socrataFetch, CENSUS_RESOURCE } from "@/lib/socrata";
import type { SocrataCarrier } from "@/lib/socrata";
import { parseNaturalQuery } from "@/lib/search-parser";
import { translateSearchQuery } from "@/lib/ai/search-translator";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { cacheGet, cacheSet } from "@/lib/cache";

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function mapCarrier(r: SocrataCarrier) {
  const riskIndicator = computeQuickRiskIndicator({
    powerUnits: r.power_units ? parseInt(r.power_units, 10) : undefined,
    totalDrivers: r.total_drivers ? parseInt(r.total_drivers, 10) : undefined,
    addDate: r.add_date,
    mcs150Date: r.mcs150_date,
    statusCode: r.status_code,
  });

  return {
    dotNumber: parseInt(r.dot_number, 10),
    legalName: r.legal_name ?? "",
    dbaName: r.dba_name ?? null,
    statusCode: r.status_code ?? null,
    phyState: r.phy_state ?? null,
    powerUnits: r.power_units ? parseInt(r.power_units, 10) : null,
    classdef: r.classdef ?? null,
    businessOrgDesc: r.business_org_desc ?? null,
    addDate: r.add_date ?? null,
    mcNumber: r.docket1
      ? `${r.docket1prefix ?? ""}${r.docket1}`
      : null,
    riskIndicator,
  };
}

/** Build a Response with edge-cache headers */
function jsonCached(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      // Cache at Vercel edge for 2 min, stale-while-revalidate for 10 min
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
    },
  });
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid search parameters", 400);
  }

  const { q, limit } = parsed.data;

  // ── Layer 1: App-level cache (Redis or in-memory, 5 min) ──────
  const cacheKey = `search:${q.toLowerCase().trim()}:${limit}`;
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) {
    return jsonCached(cached);
  }

  // ── Layer 2: Regex natural language parser (free, <1ms) ───────
  const natural = parseNaturalQuery(q);
  if (natural) {
    const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
      $where: natural.soqlWhere,
      $limit: String(Math.min(natural.limit, limit)),
      $order: "legal_name ASC",
    });

    const response = {
      results: results.map(mapCarrier),
      total: results.length,
      searchMode: "natural" as const,
      searchDescription: natural.description,
    };
    await cacheSet(cacheKey, response, 300);
    return jsonCached(response);
  }

  // ── Layer 3: Natural language → parallel AI + standard search ─
  const isNaturalLanguage = /\b(in|with|more than|less than|over|under|between|near|new|large|small|active|inactive|hazmat|broker|carrier|trucking|freight|who|where|find|show|list|get)\b/i.test(q);

  if (isNaturalLanguage) {
    // Fire BOTH searches in parallel — return AI results if they succeed,
    // otherwise fall back to standard results. User always gets a fast response.
    const [aiResult, standardResults] = await Promise.all([
      translateSearchQuery(q)
        .then(async (ai) => {
          if (!ai) return null;
          try {
            const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
              $where: ai.soqlWhere,
              $limit: String(Math.min(ai.limit, limit)),
              $order: "legal_name ASC",
            });
            return {
              results: results.map(mapCarrier),
              total: results.length,
              searchMode: "ai" as const,
              searchDescription: ai.description,
            };
          } catch {
            return null;
          }
        })
        .catch(() => null),
      searchCarriers(q, limit)
        .then((results) => ({
          results: results.map(mapCarrier),
          total: results.length,
          searchMode: "standard" as const,
          searchDescription: null as string | null,
        }))
        .catch(() => ({
          results: [] as ReturnType<typeof mapCarrier>[],
          total: 0,
          searchMode: "standard" as const,
          searchDescription: null as string | null,
        })),
    ]);

    // Prefer AI results if they returned data, otherwise use standard
    const response = (aiResult && aiResult.results.length > 0) ? aiResult : standardResults;
    await cacheSet(cacheKey, response, 300);
    return jsonCached(response);
  }

  // ── Layer 4: Standard search (DOT#, MC#, name) ───────────────
  const results = await searchCarriers(q, limit);

  const response = {
    results: results.map(mapCarrier),
    total: results.length,
    searchMode: "standard" as const,
    searchDescription: null,
  };
  await cacheSet(cacheKey, response, 300);
  return jsonCached(response);
}
