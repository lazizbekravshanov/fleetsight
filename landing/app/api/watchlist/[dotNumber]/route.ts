import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http";
import { getCarrierProfile, getCarrierAuthority, extractCarrierRecord } from "@/lib/fmcsa";

/** DELETE /api/watchlist/[dotNumber] — remove from watchlist */
export async function DELETE(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  await prisma.watchedCarrier.deleteMany({
    where: { userId: session.user.id, dotNumber: context.params.dotNumber },
  });

  return new Response(null, { status: 204 });
}

/**
 * PATCH /api/watchlist/[dotNumber] — refresh FMCSA status and detect changes.
 * Updates lastUsdotStatus, lastAuthStatus, lastCheckedAt, statusChanged.
 */
export async function PATCH(
  _req: NextRequest,
  context: { params: { dotNumber: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const dot = context.params.dotNumber;

  const existing = await prisma.watchedCarrier.findUnique({
    where: { userId_dotNumber: { userId: session.user.id, dotNumber: dot } },
  });
  if (!existing) return jsonError("Not in watchlist", 404);

  // Fetch live FMCSA status
  let newUsdotStatus: string | null = null;
  let newAuthStatus: string | null = null;

  try {
    const [profile, authority] = await Promise.all([
      getCarrierProfile(dot).catch(() => null),
      getCarrierAuthority(dot).catch(() => null),
    ]);

    const record = extractCarrierRecord(profile);
    if (record) {
      const allowed = record.allowedToOperate;
      const oosDate = record.oosDate;
      if (allowed === "Y") newUsdotStatus = "AUTHORIZED";
      else if (allowed === "N") newUsdotStatus = oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";
    }

    if (authority && typeof authority === "object") {
      const content = (authority as Record<string, unknown>).content;
      if (Array.isArray(content) && content.length > 0) {
        let hasActive = false;
        for (const entry of content) {
          const ca = (entry as Record<string, unknown>).carrierAuthority as Record<string, unknown> | undefined;
          if (ca?.commonAuthorityStatus === "A" || ca?.contractAuthorityStatus === "A" || ca?.brokerAuthorityStatus === "A") {
            hasActive = true;
          }
        }
        newAuthStatus = hasActive ? "ACTIVE" : "NONE ACTIVE";
      }
    }
  } catch {
    // FMCSA unavailable — update timestamp only
  }

  const statusChanged =
    (newUsdotStatus !== null && newUsdotStatus !== existing.lastUsdotStatus) ||
    (newAuthStatus !== null && newAuthStatus !== existing.lastAuthStatus);

  const updated = await prisma.watchedCarrier.update({
    where: { id: existing.id },
    data: {
      lastUsdotStatus: newUsdotStatus ?? existing.lastUsdotStatus,
      lastAuthStatus: newAuthStatus ?? existing.lastAuthStatus,
      lastCheckedAt: new Date(),
      statusChanged,
    },
  });

  return Response.json({ carrier: updated, statusChanged });
}
