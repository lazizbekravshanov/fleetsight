import type { EpaEnforcement } from "@/components/carrier/types";

const ECHO_BASE = "https://echodata.epa.gov/echo";

/**
 * Search EPA ECHO for enforcement records by company name.
 * Free API, no key needed.
 */
export async function searchEpaEnforcement(
  companyName: string,
  state?: string
): Promise<EpaEnforcement[]> {
  if (!companyName.trim()) return [];

  try {
    const params = new URLSearchParams({
      output: "JSON",
      p_fn: companyName.trim().substring(0, 100),
      ...(state ? { p_st: state.toUpperCase() } : {}),
    });

    const res = await fetch(
      `${ECHO_BASE}/echo_rest_services.get_facilities?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();

    // ECHO wraps facility results in Results.Facilities
    const facilities = data?.Results?.Facilities;
    if (!Array.isArray(facilities)) return [];

    const results: EpaEnforcement[] = [];
    for (const f of facilities.slice(0, 10)) {
      const registryId = f.RegistryID ?? f.FacilityID ?? "";
      results.push({
        facilityName: f.FacilityName ?? f.Name ?? companyName,
        registryId,
        city: f.City ?? "",
        state: f.State ?? "",
        programAreas: parseProgramAreas(f),
        violationStatus: f.ViolationStatus ?? f.CurrVioFlag === "Y" ? "In Violation" : "No Violation",
        lastInspectionDate: f.LastInspectionDate ?? f.DfrUrl ?? "",
        penalties: parseFloat(f.TotalPenalties ?? f.FedPenalties ?? "0") || 0,
        url: registryId
          ? `https://echo.epa.gov/detailed-facility-report?fid=${registryId}`
          : `https://echo.epa.gov/facilities/facility-search/results?name=${encodeURIComponent(companyName)}`,
      });
    }

    return results;
  } catch {
    return [];
  }
}

function parseProgramAreas(facility: Record<string, unknown>): string[] {
  const areas: string[] = [];
  if (facility.CAAFlag === "Y") areas.push("Clean Air Act");
  if (facility.CWAFlag === "Y") areas.push("Clean Water Act");
  if (facility.RCRAFlag === "Y") areas.push("RCRA (Hazardous Waste)");
  if (facility.SDWISFlag === "Y") areas.push("Safe Drinking Water");
  if (facility.TRIFlag === "Y") areas.push("Toxics Release");
  // Fallback: check ProgramAreas string
  if (areas.length === 0 && typeof facility.ProgramAreas === "string") {
    return facility.ProgramAreas.split(",").map((s) => (s as string).trim()).filter(Boolean);
  }
  return areas;
}
