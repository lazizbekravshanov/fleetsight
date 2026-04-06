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
    return jsonError("Unauthorized", 401);
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

  const dotNumbers: string[] = raw
    .split(/[\n,]+/)
    .map((s: string) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s: string) => /^\d{1,10}$/.test(s))
    .slice(0, 1000);

  if (dotNumbers.length === 0) {
    return jsonError("No valid DOT numbers found in input", 400);
  }

  const unique: string[] = [...new Set(dotNumbers)];

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
          legalName: `DOT ${dot}`,
        },
        update: {},
      });
      added++;
    } catch {
      // Skip on error
    }
  }

  return Response.json({ parsed: unique.length, added });
}
