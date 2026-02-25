import type { CourtCase, BankruptcyCase } from "@/components/carrier/types";

const CL_BASE = "https://www.courtlistener.com/api/rest/v3";

function getHeaders(token?: string): Record<string, string> {
  const authToken = token || process.env.COURTLISTENER_TOKEN;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers.Authorization = `Token ${authToken}`;
  return headers;
}

/**
 * Search CourtListener for federal litigation involving named entities.
 * Optional COURTLISTENER_TOKEN env var. Graceful fallback.
 */
export async function searchCourtListener(
  names: string[],
  token?: string
): Promise<CourtCase[]> {
  if (names.length === 0) return [];

  const results: CourtCase[] = [];
  const headers = getHeaders(token);

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

/**
 * Search CourtListener specifically for bankruptcy dockets.
 * Uses docket search with bankruptcy court filter.
 */
export async function searchBankruptcy(
  names: string[],
  token?: string
): Promise<BankruptcyCase[]> {
  if (names.length === 0) return [];

  const results: BankruptcyCase[] = [];
  const headers = getHeaders(token);

  // Only query company name + first officer to conserve rate limit
  for (const name of names.slice(0, 2)) {
    try {
      // Search dockets in bankruptcy courts
      const url = `${CL_BASE}/search/?q=${encodeURIComponent(`"${name}"`)}&type=r&court=bankr&order_by=score+desc&page_size=5`;
      const res = await fetch(url, {
        headers,
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.results;
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        // Try to extract chapter from case name or description
        const caseText = (item.caseName ?? item.case_name ?? "").toLowerCase();
        let chapter = "unknown";
        if (caseText.includes("chapter 7") || caseText.includes("ch. 7")) chapter = "Chapter 7";
        else if (caseText.includes("chapter 11") || caseText.includes("ch. 11")) chapter = "Chapter 11";
        else if (caseText.includes("chapter 13") || caseText.includes("ch. 13")) chapter = "Chapter 13";

        results.push({
          caseName: item.caseName ?? item.case_name ?? name,
          court: item.court ?? item.court_id ?? "Bankruptcy",
          chapter,
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

  // Deduplicate
  const seen = new Set<string>();
  return results.filter((c) => {
    const key = c.docketNumber || c.caseName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}
