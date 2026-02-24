import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { getInspectionsByDot, getFleetUnitsByInspectionIds } from "@/lib/socrata";
import { decodeVinBatch, getRecallsByVehicle, getComplaintsByVehicle } from "@/lib/nhtsa";

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

  // 1. Get inspections to find inspection IDs
  const inspections = await getInspectionsByDot(dotNumber, 50).catch(() => []);
  const inspectionIds = inspections
    .map((i) => i.inspection_id)
    .filter((id): id is string => !!id);

  // 2. Get fleet units via inspection IDs
  const units = await getFleetUnitsByInspectionIds(inspectionIds).catch(() => []);

  // 3. Extract unique VINs (>= 11 chars)
  const uniqueVins = [
    ...new Set(
      units
        .map((u) => u.insp_unit_vehicle_id_number?.trim())
        .filter((v): v is string => !!v && v.length >= 11)
    ),
  ];

  // 4. Decode VINs via NHTSA
  const decodedVehicles = await decodeVinBatch(uniqueVins).catch(() => []);

  // 5. Dedupe make/model/year combos, cap at 20 for recall lookups
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

  // 6. Fetch recalls and complaints in parallel
  const [recallArrays, complaintArrays] = await Promise.all([
    Promise.all(
      combos.map((c) => getRecallsByVehicle(c.make, c.model, c.year).catch(() => []))
    ),
    Promise.all(
      combos.map((c) => getComplaintsByVehicle(c.make, c.model, c.year).catch(() => []))
    ),
  ]);
  const recalls = recallArrays.flat();
  const complaints = complaintArrays.flat();

  return Response.json({ units, decodedVehicles, recalls, complaints });
}
