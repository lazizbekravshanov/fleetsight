import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { searchCarriers } from "@/lib/socrata";

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("Invalid search parameters", 400);
  }

  const { q, limit } = parsed.data;
  const results = await searchCarriers(q, limit);

  return Response.json({
    results: results.map((r) => ({
      dotNumber: parseInt(r.dot_number, 10),
      legalName: r.legal_name ?? "",
      dbaName: r.dba_name ?? null,
      statusCode: r.status_code ?? null,
      phyState: r.phy_state ?? null,
      powerUnits: r.power_units ? parseInt(r.power_units, 10) : null,
    })),
    total: results.length,
  });
}
