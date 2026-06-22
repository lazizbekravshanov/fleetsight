import { socrataFetch, INSPECTION_RESOURCE, CRASH_RESOURCE } from "@/lib/socrata";
import { buildStateMap, type InspectionRow, type CrashRow } from "@/lib/stats/state-aggregate";
import { cacheGet, cacheSet } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // run per-request (Redis + edge cache handle caching), no build-time Socrata fetch
export const maxDuration = 20;

const CACHE_KEY = "stats:state-map:v1";
const EDGE_HEADERS = {
  "Content-Type": "application/json",
  // National aggregates change slowly — cache hard at the edge for a day.
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
  "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
};

const EMPTY = { states: {}, max: { inspections: 0, crashes: 0, fatalities: 0 } };

/** GET /api/stats/state-map — national FMCSA inspections, crashes, and
 *  fatalities aggregated per state (live Socrata, cached 24h). */
export async function GET() {
  const cached = await cacheGet<unknown>(CACHE_KEY).catch(() => null);
  if (cached) return new Response(JSON.stringify(cached), { headers: EDGE_HEADERS });

  try {
    const [inspections, crashes] = await Promise.all([
      socrataFetch<InspectionRow>(INSPECTION_RESOURCE, {
        $select: "report_state,count(*) as n",
        $group: "report_state",
        $limit: "100",
      }),
      socrataFetch<CrashRow>(CRASH_RESOURCE, {
        $select: "report_state,count(*) as crashes,sum(fatalities::number) as fatalities",
        $group: "report_state",
        $limit: "100",
      }),
    ]);

    const payload = { ...buildStateMap(inspections, crashes), updatedAt: new Date().toISOString() };
    await cacheSet(CACHE_KEY, payload, 86400).catch(() => {});
    return new Response(JSON.stringify(payload), { headers: EDGE_HEADERS });
  } catch {
    // Never fail the landing page — degrade to empty.
    return new Response(JSON.stringify(EMPTY), { headers: { "Content-Type": "application/json" } });
  }
}
