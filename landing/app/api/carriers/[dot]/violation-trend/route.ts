import { NextRequest } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const paramSchema = z.object({
  dot: z.string().regex(/^\d{1,10}$/, "USDOT must be numeric"),
});

export async function GET(
  _req: NextRequest,
  context: { params: { dot: string } }
) {
  const parsed = paramSchema.safeParse(context.params);
  if (!parsed.success) {
    return jsonError("Invalid USDOT number", 400);
  }

  const dotNumber = parseInt(parsed.data.dot, 10);

  try {
    // Build the 12-month window
    const now = new Date();
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    );

    // Query all violations for this carrier in the last 12 months
    const violations = await prisma.inspectionViolation.findMany({
      where: {
        dotNumber,
        inspectionDate: { gte: twelveMonthsAgo },
      },
      select: {
        inspectionDate: true,
        oosViolation: true,
      },
    });

    // Build a map of YYYY-MM -> { violations, oosViolations }
    const monthMap = new Map<
      string,
      { violations: number; oosViolations: number }
    >();

    // Seed all 12 months with zeros
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { violations: 0, oosViolations: 0 });
    }

    // Tally violations into buckets
    for (const v of violations) {
      const d = new Date(v.inspectionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.violations++;
        if (v.oosViolation) {
          bucket.oosViolations++;
        }
      }
    }

    // Convert to sorted array
    const months = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({
        month,
        violations: counts.violations,
        oosViolations: counts.oosViolations,
      }));

    return Response.json({ months });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Violation trend error:", msg);
    return jsonError(`Failed to fetch violation trend: ${msg}`, 500);
  }
}
