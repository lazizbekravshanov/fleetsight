import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getUserSubscription, canAddCarriers } from "@/lib/subscriptions";

export async function POST(
  req: NextRequest,
  context: { params: { rosterId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return jsonError("Unauthorized", 401);
  }

  const subscription = await getUserSubscription(session.user.id);
  if (!subscription || subscription.status !== "active") {
    return jsonError("Active subscription required", 403);
  }

  const roster = await prisma.monitoredRoster.findFirst({
    where: { id: context.params.rosterId, userId: session.user.id },
  });
  if (!roster) {
    return jsonError("Roster not found", 404);
  }

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.text === "string" ? body.text : "";

  if (!raw.trim()) {
    return jsonError("No data provided. Paste DOT numbers (one per line, or comma-separated).", 400);
  }

  // Parse DOT numbers from text: supports comma-separated, newline-separated, CSV rows
  const dotNumbers: string[] = raw
    .split(/[\n,]+/)
    .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s: string) => /^\d{1,10}$/.test(s))
    .slice(0, 1000);

  if (dotNumbers.length === 0) {
    return jsonError("No valid DOT numbers found in input", 400);
  }

  // Check tier limit
  const unique: string[] = [...new Set(dotNumbers)];
  const check = await canAddCarriers(session.user.id, subscription.tier, unique.length);
  if (!check.allowed) {
    return jsonError(
      `Carrier limit exceeded. You have ${check.current}/${check.limit}. Cannot add ${unique.length} more.`,
      403
    );
  }

  // Bulk upsert
  let added = 0;
  for (const dot of unique) {
    try {
      await prisma.rosterCarrier.upsert({
        where: {
          rosterId_dotNumber: {
            rosterId: roster.id,
            dotNumber: dot,
          },
        },
        create: {
          rosterId: roster.id,
          dotNumber: dot,
          legalName: `DOT ${dot}`, // Will be enriched on first health check
        },
        update: {},
      });
      added++;
    } catch {
      // Skip on error
    }
  }

  return Response.json({
    parsed: unique.length,
    added,
    total: check.current + added,
  });
}
