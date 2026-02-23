import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getFleetUnitsByDot } from "@/lib/socrata";
import { decodeVinBatch, getRecallsByVehicle } from "@/lib/nhtsa";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  // 1. Get fleet units from Socrata
  const units = await getFleetUnitsByDot(dotNumber).catch(() => []);

  // 2. Extract unique VINs (>= 11 chars)
  const uniqueVins = [
    ...new Set(
      units
        .map((u) => u.vin?.trim())
        .filter((v): v is string => !!v && v.length >= 11)
    ),
  ];

  // 3. Decode VINs via NHTSA
  const decodedVehicles = await decodeVinBatch(uniqueVins).catch(() => []);

  // 4. Dedupe make/model/year combos, cap at 20 for recall lookups
  const seen = new Set<string>();
  const combos: { make: string; model: string; year: string }[] = [];
  for (const v of decodedVehicles) {
    if (!v.make || !v.model || !v.modelYear) continue;
    const key = `${v.make}|${v.model}|${v.modelYear}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combos.push({ make: v.make, model: v.model, year: v.modelYear });
    if (combos.length >= 20) break;
  }

  // 5. Fetch recalls in parallel
  const recallArrays = await Promise.all(
    combos.map((c) => getRecallsByVehicle(c.make, c.model, c.year).catch(() => []))
  );
  const recalls = recallArrays.flat();

  return Response.json({ units, decodedVehicles, recalls });
}
