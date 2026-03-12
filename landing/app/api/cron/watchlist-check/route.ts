import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCarrierProfile, getCarrierAuthority, extractCarrierRecord } from "@/lib/fmcsa";
import { Resend } from "resend";

export const maxDuration = 60;

/** POST /api/cron/watchlist-check — called by Vercel Cron daily */
export async function GET(req: NextRequest) {
  // Verify this is a Vercel Cron call or internal call
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get all watched carriers grouped by user
  const watched = await prisma.watchedCarrier.findMany({
    include: { user: { select: { email: true } } },
    orderBy: { addedAt: "asc" },
  });

  if (watched.length === 0) return Response.json({ checked: 0, alerts: 0 });

  let alerts = 0;
  const changes: Map<string, { email: string; carriers: string[] }> = new Map();

  // Check each carrier (rate-limited — process in serial to avoid overwhelming FMCSA)
  for (const wc of watched) {
    try {
      const [profile, authority] = await Promise.all([
        getCarrierProfile(wc.dotNumber).catch(() => null),
        getCarrierAuthority(wc.dotNumber).catch(() => null),
      ]);

      // Derive current status
      let usdotStatus: string | null = null;
      const carrierRecord = extractCarrierRecord(profile);
      if (carrierRecord?.allowedToOperate === "Y") usdotStatus = "AUTHORIZED";
      else if (carrierRecord?.allowedToOperate === "N") usdotStatus = carrierRecord.oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";

      let authStatus: string | null = null;
      if (authority && typeof authority === "object") {
        const content = (authority as Record<string, unknown>).content;
        if (Array.isArray(content) && content.length > 0) {
          let hasActive = false;
          for (const entry of content) {
            const ca = (entry as Record<string, unknown>).carrierAuthority as Record<string, unknown> | undefined;
            if (ca?.commonAuthorityStatus === "A" || ca?.contractAuthorityStatus === "A" || ca?.brokerAuthorityStatus === "A") {
              hasActive = true;
              break;
            }
          }
          authStatus = hasActive ? "ACTIVE" : "NONE ACTIVE";
        }
      }

      // Detect status change
      const usdotChanged = usdotStatus !== null && wc.lastUsdotStatus !== null && usdotStatus !== wc.lastUsdotStatus;
      const authChanged = authStatus !== null && wc.lastAuthStatus !== null && authStatus !== wc.lastAuthStatus;
      const statusChanged = usdotChanged || authChanged;

      // Update DB
      await prisma.watchedCarrier.update({
        where: { id: wc.id },
        data: {
          lastUsdotStatus: usdotStatus ?? wc.lastUsdotStatus,
          lastAuthStatus: authStatus ?? wc.lastAuthStatus,
          lastCheckedAt: new Date(),
          statusChanged,
        },
      });

      // Collect alerts
      if (statusChanged && wc.user.email) {
        const userAlerts = changes.get(wc.userId) ?? { email: wc.user.email, carriers: [] };
        const changeDesc = [
          usdotChanged ? `USDOT: ${wc.lastUsdotStatus} → ${usdotStatus}` : null,
          authChanged ? `Auth: ${wc.lastAuthStatus} → ${authStatus}` : null,
        ].filter(Boolean).join(", ");
        userAlerts.carriers.push(`${wc.legalName} (DOT ${wc.dotNumber}): ${changeDesc}`);
        changes.set(wc.userId, userAlerts);
        alerts++;
      }
    } catch {
      // Skip failed carriers silently
    }
  }

  // Send email digests
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "alerts@fleetsight.io";
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

  for (const [, { email, carriers }] of changes) {
    if (!resend) continue;
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `FleetSight: ${carriers.length} carrier${carriers.length > 1 ? "s" : ""} changed status`,
        html: buildAlertEmail(carriers),
      });
    } catch {
      // Email failure is non-fatal
    }
  }

  return Response.json({ checked: watched.length, alerts });
}

function buildAlertEmail(carriers: string[]): string {
  const rows = carriers
    .map((c) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151">${c}</td></tr>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="height:4px;background:linear-gradient(to right,#6366f1,#818cf8)"></div>
    <div style="padding:32px">
      <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin:0 0 8px">FleetSight Watchlist</p>
      <h1 style="font-size:22px;font-weight:600;color:#111827;margin:0 0 8px">Status Change Alert</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px">The following carriers on your watchlist have changed status:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Carrier · Change</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:13px;color:#9ca3af;margin:24px 0 0">
        Log in to <a href="https://fleetsight.vercel.app/dashboard" style="color:#6366f1">FleetSight</a> to review your watchlist.
      </p>
    </div>
  </div>
</body>
</html>`;
}
