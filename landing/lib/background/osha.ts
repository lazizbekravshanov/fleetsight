import type { OshaViolation } from "@/components/carrier/types";

const DOL_BASE = "https://enforcedata.dol.gov/api/osha_inspection";

/**
 * Search DOL OSHA enforcement data for a company.
 * Free API, no key needed, reasonable rate limits.
 */
export async function searchOshaViolations(
  companyName: string,
  state?: string
): Promise<OshaViolation[]> {
  if (!companyName.trim()) return [];

  try {
    // DOL API uses field-based filters
    const params = new URLSearchParams({
      employer_name: companyName.trim().substring(0, 100),
      ...(state ? { site_state: state.toUpperCase() } : {}),
      page: "0",
      size: "10",
    });

    const res = await fetch(`${DOL_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return [];
    const data = await res.json();

    // DOL API wraps results in different structures
    const items = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
    if (!Array.isArray(items)) return [];

    const results: OshaViolation[] = [];
    for (const item of items.slice(0, 10)) {
      results.push({
        activityNumber: item.activity_nr?.toString() ?? item.activityNumber ?? "",
        inspectionDate: item.open_date ?? item.inspectionDate ?? "",
        establishment: item.estab_name ?? item.establishment ?? companyName,
        city: item.site_city ?? item.city ?? "",
        state: item.site_state ?? item.state ?? "",
        violationType: item.viol_type_desc ?? item.violationType ?? item.insp_type ?? "",
        penalty: parseFloat(item.total_current_penalty ?? item.penalty ?? "0") || 0,
        description: item.violation_desc ?? item.hazsub_desc ?? item.description ?? "",
        status: item.case_status ?? item.status ?? "unknown",
      });
    }

    return results;
  } catch {
    return [];
  }
}
