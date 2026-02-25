import type { EdgarFiling } from "@/components/carrier/types";

const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index?q=";

/**
 * Search SEC EDGAR full-text search for a company name or officer names.
 * Must set User-Agent per SEC policy. No key needed.
 */
export async function searchEdgar(
  companyName: string,
  officers: string[] = []
): Promise<EdgarFiling[]> {
  const queries = [companyName, ...officers].filter(Boolean).slice(0, 3);
  const results: EdgarFiling[] = [];

  for (const query of queries) {
    try {
      const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${query}"`)}&dateRange=custom&startdt=2015-01-01&forms=10-K,10-Q,8-K,S-1,DEF%2014A&from=0&size=5`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "FleetSight/1.0 (compliance@fleetsight.app)",
          Accept: "application/json",
        },
        next: { revalidate: 86400 },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const hits = data?.hits?.hits;
      if (!Array.isArray(hits)) continue;

      for (const hit of hits) {
        const src = hit._source ?? {};
        results.push({
          companyName: src.entity_name ?? src.display_names?.[0] ?? query,
          formType: src.form_type ?? "Unknown",
          dateFiled: src.file_date ?? "",
          description: src.file_description ?? src.form_type ?? "",
          url: src.file_num
            ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${src.file_num}&type=&dateb=&owner=include&count=10`
            : `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(query)}`,
        });
      }
    } catch {
      continue;
    }
  }

  // Deduplicate by form_type+date
  const seen = new Set<string>();
  return results.filter((f) => {
    const key = `${f.formType}|${f.dateFiled}|${f.companyName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}
