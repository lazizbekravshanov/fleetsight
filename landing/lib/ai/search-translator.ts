import { callClaude } from "./client";
import { cacheGet, cacheSet } from "@/lib/cache";

export type AiSearchResult = {
  soqlWhere: string;
  limit: number;
  description: string;
};

const SYSTEM_PROMPT = `You are a SoQL query translator for the FMCSA carrier census dataset. Convert natural language search queries into Socrata SoQL WHERE clauses.

Available columns:
- legal_name (string) - company name
- dba_name (string) - doing business as
- dot_number (string) - USDOT number
- status_code (string) - 'A' for active, 'I' for inactive
- phy_state (string) - 2-letter state code (e.g. 'TX', 'CA')
- phy_city (string) - city name (UPPERCASE in data)
- power_units (number) - number of power units/trucks
- total_drivers (number) - number of drivers
- hm_ind (string) - 'Y' if hazmat carrier
- classdef (string) - contains 'CARRIER', 'BROKER', 'FREIGHT FORWARDER'
- carrier_operation (string) - 'A' interstate, 'B' intrastate
- add_date (string) - authority grant date (ISO format)
- mcs150_date (string) - last MCS-150 update
- business_org_desc (string) - 'SOLE PROPRIETORSHIP', 'CORPORATION', 'LLC', etc.
- fleetsize (string) - '1-5', '6-20', '21-100', '101-500', '501-1000', '1001+'

Rules:
1. Always use status_code='A' unless the user asks for inactive carriers
2. String comparisons must use upper() for case-insensitivity: upper(legal_name) like '%SWIFT%'
3. State must be 2-letter uppercase code
4. For date comparisons, use: add_date > '2024-01-01'
5. For "new" carriers, filter add_date in last 6 months
6. For "large" carriers, power_units >= 100
7. For "small" carriers, power_units <= 10

Respond with ONLY a JSON object, no markdown, no explanation:
{"where": "SoQL WHERE clause", "limit": number, "description": "human readable description"}

If the query cannot be translated, respond with: {"error": "reason"}`;

/**
 * Use Claude Haiku to translate natural language into a SoQL query.
 * Returns null if the AI is unavailable or the query can't be translated.
 */
export async function translateSearchQuery(
  query: string
): Promise<AiSearchResult | null> {
  // Cache AI translations for 1 hour — same query always produces the same SoQL
  const cacheKey = `ai-search:${query.toLowerCase().trim()}`;
  const cached = await cacheGet<AiSearchResult | null>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  const response = await callClaude(
    SYSTEM_PROMPT,
    [{ role: "user", content: query }],
    { maxTokens: 256, temperature: 0 }
  );

  if (!response) return null;

  try {
    // Strip markdown fences if present
    const clean = response.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (parsed.error) return null;
    if (!parsed.where || typeof parsed.where !== "string") return null;

    // Basic safety: reject anything with semicolons, DROP, DELETE, etc.
    const lower = parsed.where.toLowerCase();
    if (/;|drop |delete |update |insert |alter |create /i.test(lower)) {
      return null;
    }

    const result: AiSearchResult = {
      soqlWhere: parsed.where,
      limit: Math.min(parsed.limit ?? 50, 50),
      description: parsed.description ?? query,
    };
    await cacheSet(cacheKey, result, 3600); // 1 hour
    return result;
  } catch {
    return null;
  }
}
