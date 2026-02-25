import type { SamExclusion } from "@/components/carrier/types";

const SAM_BASE = "https://api.sam.gov/entity-information/v2/exclusions";

/**
 * Search SAM.gov exclusions API for names.
 * Graceful fallback when no API key or rate-limited.
 */
export async function searchSamExclusions(
  names: string[],
  apiKey?: string
): Promise<SamExclusion[]> {
  const key = apiKey || process.env.SAM_GOV_API_KEY;
  if (!key || names.length === 0) return [];

  const results: SamExclusion[] = [];

  // SAM.gov free tier is 10 requests/day, so only query first 3 names
  for (const name of names.slice(0, 3)) {
    try {
      const url = `${SAM_BASE}?api_key=${key}&q=${encodeURIComponent(name)}&limit=5`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;

      const data = await res.json();
      const records = data?.results;
      if (!Array.isArray(records)) continue;

      for (const r of records) {
        results.push({
          name: r.name ?? name,
          classification: r.classificationType ?? "unknown",
          exclusionType: r.exclusionType ?? "unknown",
          agency: r.excludingAgencyName ?? "unknown",
          activeDateRange: `${r.activeDateStart ?? "?"} - ${r.activeDateEnd ?? "present"}`,
        });
      }
    } catch {
      // Rate-limited or network error — skip gracefully
      continue;
    }
  }

  return results;
}
