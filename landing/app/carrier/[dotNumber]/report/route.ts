import { NextRequest, NextResponse } from "next/server";
import {
  getCarrierByDot,
  getInspectionsByDot,
  getCrashesByDot,
  getInsuranceByDot,
} from "@/lib/socrata";
import {
  getCarrierProfile,
  getCarrierAuthority,
  getCarrierOos,
  extractCarrierRecord,
} from "@/lib/fmcsa";
import { isSmartWayPartner } from "@/lib/smartway";

/* ── Helpers ─────────────────────────────────────────────────────── */

function esc(s: string | number | null | undefined): string {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function gradeColor(grade: string): string {
  return (
    { A: "#059669", B: "#0d9488", C: "#d97706", D: "#ea580c", F: "#dc2626" }[grade] ?? "#6b7280"
  );
}

function statusColor(status: string | null): string {
  if (!status) return "#6b7280";
  if (status === "AUTHORIZED" || status === "ACTIVE") return "#059669";
  if (status === "OUT-OF-SERVICE" || status.includes("NOT")) return "#dc2626";
  return "#6b7280";
}

function quickGrade(
  statusCode: string | undefined,
  usdotStatus: string | null,
  priorRevoke: string | undefined,
  addDate: string | undefined,
): { score: number; grade: string } {
  let score = 100;
  if (usdotStatus === "OUT-OF-SERVICE") score -= 50;
  else if (usdotStatus === "NOT AUTHORIZED") score -= 40;
  else if (!usdotStatus && statusCode !== "A") score -= 30;
  if (priorRevoke === "Y") score -= 20;
  if (addDate) {
    const days = Math.floor((Date.now() - new Date(addDate).getTime()) / 86400000);
    if (days < 90) score -= 15;
    else if (days < 180) score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  const grade =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : score >= 35 ? "D" : "F";
  return { score, grade };
}

function authorityAge(addDate: string | undefined): string {
  if (!addDate) return "\u2014";
  const days = Math.floor((Date.now() - new Date(addDate).getTime()) / 86400000);
  if (days < 30) return `${days} days`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  return `${years}y ${months}m`;
}

function fmt(date: string | null | undefined): string {
  if (!date) return "\u2014";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

/* ── Route Handler ──────────────────────────────────────────────── */

export async function GET(
  _req: NextRequest,
  { params }: { params: { dotNumber: string } },
) {
  const dotNum = parseInt(params.dotNumber, 10);
  if (isNaN(dotNum)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const [carrier, inspections, crashes, insurance, profile, authority, oos] =
    await Promise.all([
      getCarrierByDot(dotNum),
      getInspectionsByDot(dotNum, 200).catch(() => []),
      getCrashesByDot(dotNum, 100).catch(() => []),
      getInsuranceByDot(dotNum, 50).catch(() => []),
      getCarrierProfile(String(dotNum)).catch(() => null),
      getCarrierAuthority(String(dotNum)).catch(() => null),
      getCarrierOos(String(dotNum)).catch(() => null),
    ]);

  if (!carrier) {
    return new NextResponse("Carrier not found", { status: 404 });
  }

  /* ── FMCSA status ── */
  const carrierRecord = extractCarrierRecord(profile);
  let usdotStatus: string | null = null;
  let safetyRating: string | null = null;
  if (carrierRecord) {
    if (carrierRecord.allowedToOperate === "Y") usdotStatus = "AUTHORIZED";
    else if (carrierRecord.allowedToOperate === "N")
      usdotStatus = carrierRecord.oosDate ? "OUT-OF-SERVICE" : "NOT AUTHORIZED";
    const r = carrierRecord.safetyRating ?? carrierRecord.safety_rating;
    if (r && typeof r === "string" && r !== "None") safetyRating = r;
  }

  let authStatus: string | null = null;
  const activeAuthTypes: string[] = [];
  if (authority && typeof authority === "object") {
    const content = (authority as Record<string, unknown>).content;
    if (Array.isArray(content)) {
      for (const entry of content) {
        const ca = (entry as Record<string, unknown>).carrierAuthority as
          | Record<string, unknown>
          | undefined;
        if (!ca) continue;
        if (ca.commonAuthorityStatus === "A") activeAuthTypes.push("Common");
        if (ca.contractAuthorityStatus === "A") activeAuthTypes.push("Contract");
        if (ca.brokerAuthorityStatus === "A") activeAuthTypes.push("Broker");
      }
      authStatus = activeAuthTypes.length > 0 ? "ACTIVE" : "NONE ACTIVE";
    }
  }

  let hasOos = false;
  if (oos && typeof oos === "object") {
    const content = (oos as Record<string, unknown>).content;
    if (Array.isArray(content) && content.length > 0) hasOos = true;
  }

  /* ── Safety stats ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insp = inspections as any[];
  const totalInsp = insp.length;
  const vehOos = insp.reduce((s, i) => s + parseInt(i.vehicle_oos_total ?? "0", 10), 0);
  const drvOos = insp.reduce((s, i) => s + parseInt(i.driver_oos_total ?? "0", 10), 0);
  const totalOos = insp.reduce((s, i) => s + parseInt(i.oos_total ?? "0", 10), 0);
  const oosRate = totalInsp > 0 ? ((totalOos / totalInsp) * 100).toFixed(1) : "\u2014";
  const vehOosRate = totalInsp > 0 ? ((vehOos / totalInsp) * 100).toFixed(1) : "\u2014";
  const drvOosRate = totalInsp > 0 ? ((drvOos / totalInsp) * 100).toFixed(1) : "\u2014";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cr = crashes as any[];
  const totalCrashes = cr.length;
  const totalFatalities = cr.reduce((s, c) => s + parseInt(c.fatalities ?? "0", 10), 0);
  const totalInjuries = cr.reduce((s, c) => s + parseInt(c.injuries ?? "0", 10), 0);

  /* ── Insurance ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeInsurance = (insurance as any[])
    .filter((i) => {
      if (!i.effective_date) return true;
      return new Date(i.effective_date) <= new Date();
    })
    .slice(0, 6);

  /* ── Risk grade ── */
  const { score, grade } = quickGrade(
    carrier.status_code,
    usdotStatus,
    carrier.prior_revoke_flag,
    carrier.add_date,
  );
  const gc = gradeColor(grade);
  const smartway = isSmartWayPartner(carrier.legal_name);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /* ── Build tags ── */
  const tags: { label: string; color: string }[] = [];
  if (smartway) tags.push({ label: "SmartWay Partner", color: "#059669" });
  if (carrier.hm_ind === "Y") tags.push({ label: "Hazmat Authorized", color: "#d97706" });
  if (carrier.prior_revoke_flag === "Y")
    tags.push({ label: "Prior Revocation", color: "#dc2626" });
  if (hasOos) tags.push({ label: "Active OOS Order", color: "#dc2626" });
  if (carrier.add_date) {
    const days = Math.floor(
      (Date.now() - new Date(carrier.add_date).getTime()) / 86400000,
    );
    if (days < 90)
      tags.push({ label: `New Authority (${days}d)`, color: "#dc2626" });
    else if (days < 180)
      tags.push({ label: "Recent Authority", color: "#d97706" });
  }

  /* ── HTML builders ── */

  const tagHtml = tags
    .map(
      (t) =>
        `<span style="border:1px solid ${t.color}22;background:${t.color}11;color:${t.color};border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${esc(t.label)}</span>`,
    )
    .join("");

  const statusBoxHtml = (label: string, value: string, color: string) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:4px">${esc(label)}</div>
      <div style="font-size:14px;font-weight:700;color:${color}">${esc(value)}</div>
    </div>`;

  const dataRowHtml = (label: string, value: string) => `
    <tr style="border-bottom:1px solid #f9fafb">
      <td style="padding:5px 0;color:#9ca3af;width:38%;vertical-align:top;font-size:12px">${esc(label)}</td>
      <td style="padding:5px 0;color:#111827;font-weight:500;font-size:12px">${esc(value)}</td>
    </tr>`;

  const statBoxHtml = (num: string | number, label: string, alert: boolean) => {
    const bg = alert ? "#fff5f5" : "#f9fafb";
    const bd = alert ? "#fecaca" : "#f3f4f6";
    const cl = alert ? "#dc2626" : "#111827";
    return `
    <div style="background:${bg};border:1px solid ${bd};border-radius:8px;padding:14px 16px">
      <div style="font-size:24px;font-weight:700;color:${cl};line-height:1">${esc(num)}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">${esc(label)}</div>
    </div>`;
  };

  const checkBoxHtml = (label: string) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px">
      <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af">${esc(label)}</div>
      <div style="font-size:12px;font-weight:600;margin-top:4px;color:#9ca3af">\u2014</div>
    </div>`;

  const sectionTitle = (text: string) =>
    `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;margin-top:28px">${esc(text)}</div>`;

  /* ── Carrier info rows ── */
  let carrierRows = "";
  if (carrier.phy_street)
    carrierRows += dataRowHtml(
      "Physical Address",
      [carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip]
        .filter(Boolean)
        .join(", "),
    );
  if (carrier.carrier_mailing_street && carrier.carrier_mailing_street !== carrier.phy_street)
    carrierRows += dataRowHtml(
      "Mailing Address",
      [carrier.carrier_mailing_street, carrier.carrier_mailing_city, carrier.carrier_mailing_state]
        .filter(Boolean)
        .join(", "),
    );
  if (carrier.phone) carrierRows += dataRowHtml("Phone", carrier.phone);
  if (carrier.cell_phone) carrierRows += dataRowHtml("Mobile", carrier.cell_phone);
  if (carrier.email_address) carrierRows += dataRowHtml("Email", carrier.email_address);
  if (carrier.company_officer_1 || carrier.company_officer_2)
    carrierRows += dataRowHtml(
      "Officers",
      [carrier.company_officer_1, carrier.company_officer_2].filter(Boolean).join(" \u00b7 "),
    );
  carrierRows += dataRowHtml(
    "Entity Type",
    [
      carrier.business_org_desc,
      carrier.carrier_operation === "A"
        ? "Interstate"
        : carrier.carrier_operation === "B"
          ? "Intrastate"
          : null,
    ]
      .filter(Boolean)
      .join(" \u00b7 ") || "\u2014",
  );
  carrierRows += dataRowHtml("Power Units", carrier.power_units ?? "\u2014");
  carrierRows += dataRowHtml("Total Drivers", carrier.total_drivers ?? "\u2014");
  if (carrier.total_cdl) carrierRows += dataRowHtml("CDL Drivers", carrier.total_cdl);
  if (carrier.docket1)
    carrierRows += dataRowHtml(
      "MC Docket",
      `MC-${carrier.docket1} (${carrier.docket1_status_code === "A" ? "Active" : carrier.docket1_status_code ?? "\u2014"})`,
    );
  if (carrier.add_date) carrierRows += dataRowHtml("Authority Granted", fmt(carrier.add_date));
  if (carrier.mcs150_date) carrierRows += dataRowHtml("MCS-150 Filed", fmt(carrier.mcs150_date));

  /* ── Insurance table ── */
  let insuranceHtml = "";
  if (activeInsurance.length > 0) {
    const rows = activeInsurance
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ins: any, i: number) => `
        <tr style="border-bottom:1px solid #f9fafb">
          <td style="padding:6px 8px 6px 0;color:#374151">${esc(ins.mod_col_1 ?? ins.ins_form_code ?? "\u2014")}</td>
          <td style="padding:6px 8px 6px 0;color:#374151">${esc(ins.name_company ?? "\u2014")}</td>
          <td style="padding:6px 8px 6px 0;color:#6b7280;font-family:monospace;font-size:11px">${esc(ins.policy_no ?? "\u2014")}</td>
          <td style="padding:6px 8px 6px 0;color:#6b7280">${esc(fmt(ins.effective_date))}</td>
        </tr>`,
      )
      .join("");
    insuranceHtml = `
      ${sectionTitle("Insurance Coverage")}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>
          ${["Coverage Type", "Carrier", "Policy No.", "Effective"]
            .map(
              (h) =>
                `<th style="text-align:left;padding:5px 8px 5px 0;color:#9ca3af;font-weight:600;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid #f3f4f6">${h}</th>`,
            )
            .join("")}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  /* ── Authority types ── */
  let authorityHtml = "";
  if (activeAuthTypes.length > 0) {
    authorityHtml = `
      ${sectionTitle("Active Operating Authority")}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${activeAuthTypes
          .map(
            (t) =>
              `<span style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:600;color:#15803d">${esc(t)} Authority</span>`,
          )
          .join("")}
      </div>`;
  }

  /* ── Assemble full HTML ── */
  const usdotDisplay =
    usdotStatus ?? (carrier.status_code === "A" ? "ACTIVE" : "INACTIVE");
  const usdotColor = statusColor(
    usdotStatus ?? (carrier.status_code === "A" ? "AUTHORIZED" : null),
  );
  const safetyColor =
    safetyRating === "Satisfactory"
      ? "#059669"
      : safetyRating === "Unsatisfactory"
        ? "#dc2626"
        : "#6b7280";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(carrier.legal_name)} \u2014 FleetSight Vetting Report</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0.6in 0.5in; size: letter; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; }
  </style>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111827;margin:0;padding:0;font-size:13px;line-height:1.5">

  <!-- Print button -->
  <button class="no-print" onclick="window.print()"
    style="position:fixed;top:20px;right:20px;background:#6366f1;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(99,102,241,0.3)">
    Print / Save PDF
  </button>

  <!-- Auto-print -->
  <script>setTimeout(function(){ window.print(); }, 600);</script>

  <!-- Document header -->
  <div style="border-bottom:2px solid #111827;padding:24px 48px 16px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#6366f1">FleetSight</div>
      <div style="font-size:17px;font-weight:600;margin-top:4px;color:#111827">Carrier Vetting Report</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#9ca3af;line-height:1.6">
      <div>Generated ${esc(reportDate)}</div>
      <div>fleetsight.vercel.app</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:36px 48px 48px;max-width:760px;margin:0 auto">

    <!-- Hero -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;gap:24px">
      <div style="min-width:0">
        <h1 style="font-size:26px;font-weight:700;margin:0;letter-spacing:-0.02em">${esc(carrier.legal_name)}</h1>
        ${carrier.dba_name ? `<div style="font-size:14px;color:#6b7280;margin-top:2px">DBA: ${esc(carrier.dba_name)}</div>` : ""}
        <div style="font-size:13px;color:#9ca3af;margin-top:8px">
          USDOT ${esc(carrier.dot_number)}${carrier.docket1 ? ` \u00b7 MC-${esc(carrier.docket1)}` : ""}${carrier.phy_state ? ` \u00b7 ${esc(carrier.phy_state)}` : ""}
        </div>
        ${tags.length > 0 ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">${tagHtml}</div>` : ""}
      </div>
      <div style="border:2px solid ${gc};border-radius:10px;padding:12px 20px;text-align:center;min-width:80px;flex-shrink:0">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af">Risk Grade</div>
        <div style="font-size:40px;font-weight:800;color:${gc};line-height:1.1">${esc(grade)}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px">${score}/100</div>
      </div>
    </div>

    <!-- Status row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:32px">
      ${statusBoxHtml("USDOT Status", usdotDisplay, usdotColor)}
      ${statusBoxHtml("Authority Status", authStatus ?? "\u2014", statusColor(authStatus))}
      ${statusBoxHtml("Safety Rating", safetyRating ?? "Not Rated", safetyColor)}
      ${statusBoxHtml("Authority Age", authorityAge(carrier.add_date), "#111827")}
    </div>

    <!-- Carrier Information -->
    ${sectionTitle("Carrier Information")}
    <table style="width:100%;border-collapse:collapse">
      <tbody>${carrierRows}</tbody>
    </table>

    <!-- Safety Performance -->
    ${sectionTitle("Safety Performance")}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${statBoxHtml(totalInsp, "Total Inspections", false)}
      ${statBoxHtml(`${oosRate}%`, "Overall OOS Rate", parseFloat(oosRate) > 20)}
      ${statBoxHtml(totalCrashes, "Crashes Reported", totalCrashes > 5)}
      ${statBoxHtml(`${vehOosRate}%`, "Vehicle OOS Rate", parseFloat(vehOosRate) > 20)}
      ${statBoxHtml(`${drvOosRate}%`, "Driver OOS Rate", parseFloat(drvOosRate) > 20)}
      ${statBoxHtml(totalFatalities, `Fatalities \u00b7 ${totalInjuries} Injured`, totalFatalities > 0)}
    </div>
    <p style="font-size:11px;color:#9ca3af;margin-top:10px">
      Based on ${totalInsp} inspection record${totalInsp !== 1 ? "s" : ""} and ${totalCrashes} crash report${totalCrashes !== 1 ? "s" : ""} from FMCSA data.
    </p>

    <!-- Insurance -->
    ${insuranceHtml}

    <!-- Background Screening -->
    ${sectionTitle("Background Screening Summary")}
    <p style="font-size:11px;color:#9ca3af;margin-bottom:14px;margin-top:-10px">
      Status indicators from OFAC SDN, SAM.gov, and federal court databases. Run full Background tab for detailed findings.
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${checkBoxHtml("OFAC Sanctions")}
      ${checkBoxHtml("SAM.gov Exclusions")}
      ${checkBoxHtml("Federal Court Records")}
      ${checkBoxHtml("Bankruptcy Records")}
      ${checkBoxHtml("OSHA Violations")}
      ${checkBoxHtml("EPA Enforcement")}
    </div>
    <p style="font-size:11px;color:#9ca3af;margin-top:10px">
      Full background check with officer profiles, state registrations, and sanctions screening is available in the FleetSight platform.
    </p>

    <!-- Authority types -->
    ${authorityHtml}

  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #e5e7eb;padding:16px 48px;font-size:10px;color:#9ca3af;line-height:1.6">
    <p style="margin:0">
      This report was generated by <strong>FleetSight</strong> on ${esc(reportDate)}. Data sourced from the FMCSA SAFER System, Socrata transportation datasets, and public government records. For informational and verification purposes only. FleetSight makes no warranties regarding data accuracy or completeness. Always verify carrier status directly with FMCSA before entering a load agreement.
    </p>
    <p style="margin:6px 0 0;color:#d1d5db">
      USDOT ${esc(carrier.dot_number)} \u00b7 fleetsight.vercel.app \u00b7 ${esc(reportDate)}
    </p>
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
