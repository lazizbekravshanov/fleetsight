import { NextRequest } from "next/server";
import { getServerAuthSession } from "@/auth";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: { rosterId: string } }
) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return Response.json({ carriers: [] });
  }

  const roster = await prisma.monitoredRoster.findFirst({
    where: { id: context.params.rosterId, userId: session.user.id },
  });
  if (!roster) {
    return jsonError("Roster not found", 404);
  }

  const body = await req.json().catch(() => ({}));
  const carriers = Array.isArray(body.carriers) ? body.carriers : [];

  if (carriers.length === 0) {
    return jsonError("At least one carrier required", 400);
  }

  // Validate and normalize entries
  const entries = carriers
    .filter(
      (c: unknown): c is { dotNumber: string; legalName: string } =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Record<string, unknown>).dotNumber === "string" &&
        typeof (c as Record<string, unknown>).legalName === "string"
    )
    .slice(0, 500); // Prevent massive payloads

  if (entries.length === 0) {
    return jsonError("Invalid carrier data. Each entry needs dotNumber and legalName.", 400);
  }

  // Upsert carriers
  let added = 0;
  for (const entry of entries) {
    try {
      await prisma.rosterCarrier.upsert({
        where: {
          rosterId_dotNumber: {
            rosterId: roster.id,
            dotNumber: entry.dotNumber,
          },
        },
        create: {
          rosterId: roster.id,
          dotNumber: entry.dotNumber,
          legalName: entry.legalName,
        },
        update: {
          legalName: entry.legalName,
        },
      });
      added++;
    } catch {
      // Skip duplicates or errors
    }
  }

  return Response.json({ added, total: added }, { status: 201 });
}
