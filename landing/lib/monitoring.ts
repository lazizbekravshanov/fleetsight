import { prisma } from "@/lib/prisma";
import { getCarrierProfile, getCarrierAuthority, extractCarrierRecord } from "@/lib/fmcsa";

export type HealthStatus = "green" | "yellow" | "red" | "unknown";

export type AlertType =
  | "authority_revoked"
  | "oos_order"
  | "insurance_lapse"
  | "basic_spike"
  | "status_change"
  | "inspection_oos"
  | "inspection_multi_violation"
  | "violation_rate_spike"
  | "enabler_high_risk_link"
  | "enabler_critical_upgrade";

export function deriveHealthStatus(
  usdotStatus: string | null,
  operatingAuthority: string | null,
  grade: string | null
): HealthStatus {
  if (
    usdotStatus === "OUT-OF-SERVICE" ||
    usdotStatus === "NOT AUTHORIZED" ||
    operatingAuthority === "NONE ACTIVE" ||
    grade === "F"
  ) {
    return "red";
  }
  if (grade === "C" || grade === "D") {
    return "yellow";
  }
  if (usdotStatus === "AUTHORIZED" && (grade === "A" || grade === "B")) {
    return "green";
  }
  if (usdotStatus === "AUTHORIZED") {
    return "green";
  }
  return "unknown";
}

export async function checkCarrierHealth(dotNumber: string): Promise<{
  usdotStatus: string | null;
  operatingAuthority: string | null;
  hasActiveOos: boolean;
  healthStatus: HealthStatus;
}> {
  const [profile, authority] = await Promise.all([
    getCarrierProfile(dotNumber).catch(() => null),
    getCarrierAuthority(dotNumber).catch(() => null),
  ]);

  let usdotStatus: string | null = null;
  const carrierRecord = extractCarrierRecord(profile);
  if (carrierRecord?.allowedToOperate === "Y") {
    usdotStatus = "AUTHORIZED";
  } else if (carrierRecord?.allowedToOperate === "N") {
    usdotStatus = carrierRecord.oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";
  }

  let operatingAuthority: string | null = null;
  let hasActiveOos = false;
  if (authority && typeof authority === "object") {
    const content = (authority as Record<string, unknown>).content;
    if (Array.isArray(content) && content.length > 0) {
      let hasActive = false;
      for (const entry of content) {
        const ca = (entry as Record<string, unknown>).carrierAuthority as
          | Record<string, unknown>
          | undefined;
        if (
          ca?.commonAuthorityStatus === "A" ||
          ca?.contractAuthorityStatus === "A" ||
          ca?.brokerAuthorityStatus === "A"
        ) {
          hasActive = true;
          break;
        }
      }
      operatingAuthority = hasActive ? "ACTIVE" : "NONE ACTIVE";
    }
  }

  if (
    carrierRecord?.oosDate &&
    typeof carrierRecord.oosDate === "string" &&
    carrierRecord.oosDate
  ) {
    hasActiveOos = true;
  }

  const healthStatus = deriveHealthStatus(usdotStatus, operatingAuthority, null);

  return { usdotStatus, operatingAuthority, hasActiveOos, healthStatus };
}

export async function createAlert(input: {
  userId: string;
  dotNumber: string;
  legalName: string;
  alertType: AlertType;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  previousValue?: string;
  newValue?: string;
}) {
  return prisma.monitoringAlert.create({
    data: {
      userId: input.userId,
      dotNumber: input.dotNumber,
      legalName: input.legalName,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      detail: input.detail,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
    },
  });
}

export function buildMonitoringEmail(
  alerts: { legalName: string; dotNumber: string; title: string; severity: string }[]
): string {
  const rows = alerts
    .map(
      (a) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#374151">
            <strong>${a.legalName}</strong> (DOT ${a.dotNumber})
            <br/><span style="color:#6b7280;font-size:12px">${a.title}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;${
              a.severity === "critical"
                ? "background:#fef2f2;color:#991b1b"
                : a.severity === "high"
                  ? "background:#fff7ed;color:#9a3412"
                  : "background:#fefce8;color:#854d0e"
            }">${a.severity.toUpperCase()}</span>
          </td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="height:4px;background:linear-gradient(to right,#6366f1,#818cf8)"></div>
    <div style="padding:32px">
      <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin:0 0 8px">FleetSight Monitoring</p>
      <h1 style="font-size:22px;font-weight:600;color:#111827;margin:0 0 8px">Fleet Health Alert</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px">${alerts.length} alert${alerts.length > 1 ? "s" : ""} detected in your monitored fleet:</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Carrier</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Severity</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:13px;color:#9ca3af;margin:24px 0 0">
        Log in to <a href="https://fleetsight.vercel.app/dashboard" style="color:#6366f1">FleetSight</a> to review your fleet health.
      </p>
    </div>
  </div>
</body>
</html>`;
}
