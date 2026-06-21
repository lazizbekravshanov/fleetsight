import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getServerAuthSession } from "@/auth";
import {
  searchCarriers,
  socrataFetch,
  CENSUS_RESOURCE,
  searchCarriersByOfficer,
  searchCarriersByPhone,
  searchCarriersByInsurer,
  searchCarriersByAddress,
} from "@/lib/socrata";
import type { SocrataCarrier } from "@/lib/socrata";
import { getVinCarriers } from "@/lib/affiliation-detection";
import { detectQuery } from "@/lib/search/detect";
import { parseNaturalQuery } from "@/lib/search-parser";
import { translateSearchQuery } from "@/lib/ai/search-translator";
import { computeQuickRiskIndicator } from "@/lib/risk-score";
import { cacheGet, cacheSet } from "@/lib/cache";

// This route calls Anthropic via translateSearchQuery for authenticated
// natural-language queries. Give it headroom beyond the Vercel default so the
// model response (typically 3-8s) doesn't silently time out.
export const runtime = "nodejs";
export const maxDuration = 30;

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

function mapVinCarrier(r: { dotNumber: number; legalName: string | null; statusCode: string | null }) {
  return {
    dotNumber: r.dotNumber,
    legalName: r.legalName ?? "",
    dbaName: null,
    statusCode: r.statusCode ?? null,
    phyState: null,
    powerUnits: null,
    classdef: null,
    businessOrgDesc: null,
    addDate: null,
    mcNumber: null,
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

  // ── Layer 1.5: Universal identifier detection ────────────────
  // Smart auto-detect (+ operators) routes specific identifiers to dedicated
  // lookups. name / dot / mc / natural-language fall through unchanged below.
  const detected = detectQuery(q);
  if (["vin", "phone", "officer", "address", "insurer"].includes(detected.type)) {
    let results: (ReturnType<typeof mapCarrier> | ReturnType<typeof mapVinCarrier>)[] = [];
    try {
      if (detected.type === "officer") {
        results = (await searchCarriersByOfficer(detected.value, limit)).map(mapCarrier);
      } else if (detected.type === "phone") {
        results = (await searchCarriersByPhone(detected.value, limit)).map(mapCarrier);
      } else if (detected.type === "insurer") {
        results = (await searchCarriersByInsurer(detected.value, limit)).map(mapCarrier);
      } else if (detected.type === "address") {
        const [street, city, st] = detected.value.split(",").map((s) => s.trim());
        if (street && city && st) {
          results = (await searchCarriersByAddress(street, city, st, limit)).map(mapCarrier);
        }
      } else if (detected.type === "vin") {
        const seen = new Set<number>();
        results = (await getVinCarriers(detected.value))
          .filter((c) => (seen.has(c.dotNumber) ? false : (seen.add(c.dotNumber), true)))
          .map(mapVinCarrier);
      }
    } catch {
      results = [];
    }

    const response = {
      results,
      total: results.length,
      searchMode: detected.type,
      searchDescription: `Detected ${detected.type}`,
    };
    await cacheSet(cacheKey, response, 300);
    return jsonCached(response);
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
    // Anthropic translation is gated to authenticated users only. Anonymous
    // visitors fall through to the standard fuzzy search (no AI call).
    const session = await getServerAuthSession();
    const allowAi = !!session?.user?.id;

    if (!allowAi) {
      const standardResults = await searchCarriers(q, limit).catch(() => [] as SocrataCarrier[]);
      const response = {
        results: standardResults.map(mapCarrier),
        total: standardResults.length,
        searchMode: "standard" as const,
        searchDescription: null,
        aiSkipped: "not_authenticated" as const,
      };
      await cacheSet(cacheKey, response, 300);
      return jsonCached(response);
    }

    // Authenticated: fire BOTH searches in parallel — return AI results if
    // they succeed, otherwise fall back to standard.
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
