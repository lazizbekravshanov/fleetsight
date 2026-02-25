import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { searchCarriers, socrataFetch, CENSUS_RESOURCE } from "@/lib/socrata";
import type { SocrataCarrier } from "@/lib/socrata";
import { parseNaturalQuery } from "@/lib/search-parser";
import { translateSearchQuery } from "@/lib/ai/search-translator";
import { computeQuickRiskIndicator } from "@/lib/risk-score";

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

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid search parameters", 400);
  }

  const { q, limit } = parsed.data;

  // 1. Try regex-based natural language parsing first (fast, free)
  const natural = parseNaturalQuery(q);
  if (natural) {
    const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
      $where: natural.soqlWhere,
      $limit: String(Math.min(natural.limit, limit)),
      $order: "legal_name ASC",
    });

    return Response.json({
      results: results.map(mapCarrier),
      total: results.length,
      searchMode: "natural" as const,
      searchDescription: natural.description,
    });
  }

  // 2. Check if it looks like a natural language query (not just a name/number)
  const isNaturalLanguage = /\b(in|with|more than|less than|over|under|between|near|new|large|small|active|inactive|hazmat|broker|carrier|trucking|freight|who|where|find|show|list|get)\b/i.test(q);

  if (isNaturalLanguage) {
    // 3. Try LLM-powered translation (Haiku, ~100ms, ~$0.001)
    const aiResult = await translateSearchQuery(q);
    if (aiResult) {
      try {
        const results = await socrataFetch<SocrataCarrier>(CENSUS_RESOURCE, {
          $where: aiResult.soqlWhere,
          $limit: String(Math.min(aiResult.limit, limit)),
          $order: "legal_name ASC",
        });

        return Response.json({
          results: results.map(mapCarrier),
          total: results.length,
          searchMode: "ai" as const,
          searchDescription: aiResult.description,
        });
      } catch {
        // AI-generated query failed — fall through to standard search
      }
    }
  }

  // 4. Standard search (DOT number, MC number, or name substring)
  const results = await searchCarriers(q, limit);

  return Response.json({
    results: results.map(mapCarrier),
    total: results.length,
    searchMode: "standard" as const,
    searchDescription: null,
  });
}
