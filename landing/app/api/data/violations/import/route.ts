import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { ingestViolationsForCarrier, ingestViolationsFromJson } from "@/lib/inspections/ingestion";

const dotSchema = z.object({
  dotNumber: z.number().int().positive(),
});

const bulkSchema = z.object({
  violations: z.array(z.object({
    inspection_id: z.string().optional(),
    dot_number: z.string().optional(),
    insp_date: z.string().optional(),
    insp_level_id: z.string().optional(),
    report_state: z.string().optional(),
    location_desc: z.string().optional(),
    insp_facility: z.string().optional(),
    basic: z.string().optional(),
    viol_code: z.string().optional(),
    viol_description: z.string().optional(),
    oos: z.string().optional(),
    severity_weight: z.string().optional(),
    unit_vin: z.string().optional(),
    cdl_no: z.string().optional(),
    cdl_st: z.string().optional(),
  })).max(5000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // Mode 1: Ingest from Socrata by DOT number
  const dotParsed = dotSchema.safeParse(body);
  if (dotParsed.success) {
    try {
      const result = await ingestViolationsForCarrier(dotParsed.data.dotNumber);
      return Response.json(result);
    } catch (err) {
      console.error("Violation ingestion error:", err);
      return jsonError("Failed to ingest violations from Socrata", 500);
    }
  }

  // Mode 2: Bulk JSON import
  const bulkParsed = bulkSchema.safeParse(body);
  if (bulkParsed.success) {
    try {
      const result = await ingestViolationsFromJson(bulkParsed.data.violations);
      return Response.json(result);
    } catch (err) {
      console.error("Bulk violation import error:", err);
      return jsonError("Failed to import violations", 500);
    }
  }

  return jsonError("Request must include either { dotNumber } or { violations: [...] }", 400);
}
