import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { generatePreTripFocus } from "@/lib/inspections/pre-trip";

const paramSchema = z.object({
  vin: z.string().min(1).max(20),
});

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).optional(),
});

export async function GET(
  req: NextRequest,
  context: { params: { vin: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid VIN", 400);
  }

  const { searchParams } = new URL(req.url);
  const qp = querySchema.safeParse({ months: searchParams.get("months") ?? undefined });
  const months = qp.success ? qp.data.months : undefined;

  const vin = parsed.data.vin.toUpperCase().replace(/[^A-Z0-9]/g, "");

  try {
    const sheet = await generatePreTripFocus(vin, months);
    return Response.json(sheet);
  } catch (err) {
    console.error("Pre-trip focus error:", err);
    return jsonError("Failed to generate pre-trip focus sheet", 500);
  }
}
