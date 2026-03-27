import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { normalizeVin } from "@/lib/vin-utils";

const paramSchema = z.object({
  dotNumber: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

const bodySchema = z.object({
  vins: z.array(z.string()).min(1).max(500),
});

export async function POST(
  req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const body = await req.json().catch(() => ({}));
  const bodyParsed = bodySchema.safeParse(body);
  if (!bodyParsed.success) {
    return jsonError("Provide an array of VINs (1-500)", 400);
  }

  const dotNumber = parseInt(parsed.data.dotNumber, 10);

  // Normalize and deduplicate VINs
  const validVins: string[] = [];
  const seen = new Set<string>();
  for (const raw of bodyParsed.data.vins) {
    const normalized = normalizeVin(raw);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      validVins.push(normalized);
    }
  }

  if (validVins.length === 0) {
    return jsonError("No valid VINs found in input", 400);
  }

  let imported = 0;
  let skipped = 0;

  for (const vin of validVins) {
    try {
      // Upsert Vehicle
      await prisma.vehicle.upsert({
        where: { vin },
        create: { vin },
        update: {},
      });

      // Upsert CarrierVehicle
      await prisma.carrierVehicle.upsert({
        where: {
          dotNumber_vin: { dotNumber, vin },
        },
        create: {
          dotNumber,
          vin,
          source: "import",
        },
        update: {
          lastSeenAt: new Date(),
          source: "import",
        },
      });

      imported++;
    } catch {
      skipped++;
    }
  }

  return Response.json({
    submitted: bodyParsed.data.vins.length,
    valid: validVins.length,
    imported,
    skipped,
  });
}
