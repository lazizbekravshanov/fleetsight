import type { CourtCase } from "@/components/carrier/types";

const CL_BASE = "https://www.courtlistener.com/api/rest/v3";

/**
 * Search CourtListener for federal litigation involving named entities.
 * Optional COURTLISTENER_TOKEN env var. Graceful fallback.
 */
export async function searchCourtListener(
  names: string[],
  token?: string
): Promise<CourtCase[]> {
  const authToken = token || process.env.COURTLISTENER_TOKEN;
  if (names.length === 0) return [];

  const results: CourtCase[] = [];
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authToken) {
    headers.Authorization = `Token ${authToken}`;
  }

  // Query first 3 names to stay within rate limits
  for (const name of names.slice(0, 3)) {
    try {
      const url = `${CL_BASE}/search/?q=${encodeURIComponent(`"${name}"`)}&type=r&order_by=score+desc&page_size=5`;
      const res = await fetch(url, {
        headers,
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.results;
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        results.push({
          caseName: item.caseName ?? item.case_name ?? name,
          court: item.court ?? item.court_id ?? "Federal",
          docketNumber: item.docketNumber ?? item.docket_number ?? "",
          dateFiled: item.dateFiled ?? item.date_filed ?? "",
          status: item.status ?? "unknown",
          url: item.absolute_url
            ? `https://www.courtlistener.com${item.absolute_url}`
            : "",
        });
      }
    } catch {
      continue;
    }
  }

  // Deduplicate by docket number
  const seen = new Set<string>();
  return results.filter((c) => {
    const key = c.docketNumber || c.caseName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}
