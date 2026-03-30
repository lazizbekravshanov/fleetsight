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
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    const days = Math.floor(
      (Date.now() - new Date(addDate).getTime()) / 86400000,
    );
    if (days < 90) score -= 15;
    else if (days < 180) score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  const grade =
    score >= 80
      ? "A"
      : score >= 65
        ? "B"
        : score >= 50
          ? "C"
          : score >= 35
            ? "D"
            : "F";
  return { score, grade };
}

function authorityAge(addDate: string | undefined): string {
  if (!addDate) return "\u2014";
  const days = Math.floor(
    (Date.now() - new Date(addDate).getTime()) / 86400000,
  );
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
      usdotStatus = carrierRecord.oosDate
        ? "OUT-OF-SERVICE"
        : "NOT AUTHORIZED";
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
        if (ca.contractAuthorityStatus === "A")
          activeAuthTypes.push("Contract");
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
  const vehOos = insp.reduce(
    (s, i) => s + parseInt(i.vehicle_oos_total ?? "0", 10),
    0,
  );
  const drvOos = insp.reduce(
    (s, i) => s + parseInt(i.driver_oos_total ?? "0", 10),
    0,
  );
  const totalOos = insp.reduce(
    (s, i) => s + parseInt(i.oos_total ?? "0", 10),
    0,
  );
  const oosRate =
    totalInsp > 0 ? ((totalOos / totalInsp) * 100).toFixed(1) : "0.0";
  const vehOosRate =
    totalInsp > 0 ? ((vehOos / totalInsp) * 100).toFixed(1) : "0.0";
  const drvOosRate =
    totalInsp > 0 ? ((drvOos / totalInsp) * 100).toFixed(1) : "0.0";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cr = crashes as any[];
  const totalCrashes = cr.length;
  const totalFatalities = cr.reduce(
    (s, c) => s + parseInt(c.fatalities ?? "0", 10),
    0,
  );
  const totalInjuries = cr.reduce(
    (s, c) => s + parseInt(c.injuries ?? "0", 10),
    0,
  );
  const towAway = cr.reduce(
    (s, c) => s + parseInt(c.tow_away ?? "0", 10),
    0,
  );

  /* ── Insurance ── */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeInsurance = (insurance as any[])
    .filter((i) => {
      if (!i.effective_date) return true;
      return new Date(i.effective_date) <= new Date();
    })
    .slice(0, 10);

  /* ── Risk grade ── */
  const { score, grade } = quickGrade(
    carrier.status_code,
    usdotStatus,
    carrier.prior_revoke_flag,
    carrier.add_date,
  );
  const smartway = isSmartWayPartner(carrier.legal_name);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  /* ── Flags ── */
  const flags: string[] = [];
  if (hasOos) flags.push("ACTIVE OUT-OF-SERVICE ORDER");
  if (carrier.prior_revoke_flag === "Y") flags.push("PRIOR REVOCATION ON RECORD");
  if (usdotStatus === "NOT AUTHORIZED") flags.push("NOT AUTHORIZED TO OPERATE");
  if (carrier.add_date) {
    const days = Math.floor(
      (Date.now() - new Date(carrier.add_date).getTime()) / 86400000,
    );
    if (days < 90) flags.push(`NEW AUTHORITY \u2014 ${days} DAYS OLD`);
  }

  const flagsHtml = flags.length > 0
    ? `<div style="background:#fef2f2;border:2px solid #dc2626;padding:10px 16px;margin-bottom:20px">
        <div style="font-weight:700;color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">Alerts</div>
        ${flags.map((f) => `<div style="color:#991b1b;font-size:12px;font-weight:600">\u26A0 ${esc(f)}</div>`).join("")}
       </div>`
    : "";

  /* ── Entity/operation info ── */
  const entityType = carrier.business_org_desc ?? "\u2014";
  const operation =
    carrier.carrier_operation === "A"
      ? "Interstate"
      : carrier.carrier_operation === "B"
        ? "Intrastate (Hazmat)"
        : carrier.carrier_operation === "C"
          ? "Intrastate (Non-Hazmat)"
          : "\u2014";

  /* ── Build table row helper ── */
  const row = (label: string, value: string | number | null | undefined) =>
    `<tr>
      <td style="padding:4px 12px 4px 8px;border:1px solid #d1d5db;font-size:11px;color:#4b5563;width:200px;background:#f9fafb;font-weight:600">${esc(label)}</td>
      <td style="padding:4px 8px;border:1px solid #d1d5db;font-size:12px;color:#111827">${esc(value ?? "\u2014")}</td>
    </tr>`;

  /* ── Insurance rows ── */
  const insuranceRows = activeInsurance
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ins: any) =>
        `<tr>
          <td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">${esc(ins.mod_col_1 ?? ins.ins_form_code ?? "\u2014")}</td>
          <td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">${esc(ins.name_company ?? "\u2014")}</td>
          <td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px;font-family:monospace">${esc(ins.policy_no ?? "\u2014")}</td>
          <td style="padding:4px 8px;border:1px solid #d1d5db;font-size:11px">${esc(fmt(ins.effective_date))}</td>
        </tr>`,
    )
    .join("");

  /* ── Recent inspections (last 10) ── */
  const recentInsp = insp.slice(0, 10);
  const inspRows = recentInsp
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) =>
        `<tr>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px">${esc(fmt(i.inspection_date))}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px">${esc(i.report_state ?? "\u2014")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(i.level ?? "\u2014")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(i.vehicle_oos_total ?? "0")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(i.driver_oos_total ?? "0")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(i.hazmat_oos_total ?? "0")}</td>
        </tr>`,
    )
    .join("");

  /* ── Recent crashes (last 10) ── */
  const recentCrashes = cr.slice(0, 10);
  const crashRows = recentCrashes
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c: any) =>
        `<tr>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px">${esc(fmt(c.report_date))}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px">${esc(c.report_state ?? "\u2014")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(c.fatalities ?? "0")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(c.injuries ?? "0")}</td>
          <td style="padding:3px 6px;border:1px solid #d1d5db;font-size:10px;text-align:center">${esc(c.tow_away ?? "0")}</td>
        </tr>`,
    )
    .join("");

  /* ── Assemble full HTML ── */
  const usdotDisplay =
    usdotStatus ?? (carrier.status_code === "A" ? "ACTIVE" : "INACTIVE");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>USDOT ${esc(carrier.dot_number)} \u2014 Carrier Safety Report</title>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 0.5in; size: letter; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; line-height: 1.4; }
    table { border-collapse: collapse; }
    .section-header { background: #1e3a5f; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 5px 8px; margin-top: 18px; margin-bottom: 0; }
    .th { background: #e5e7eb; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 6px; border: 1px solid #d1d5db; text-align: left; }
    .th-center { background: #e5e7eb; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 6px; border: 1px solid #d1d5db; text-align: center; }
  </style>
</head>
<body>

  <!-- Print button -->
  <button class="no-print" onclick="window.print()"
    style="position:fixed;top:16px;right:16px;background:#1e3a5f;color:#fff;border:none;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;z-index:1000">
    PRINT / SAVE PDF
  </button>

  <script>setTimeout(function(){ window.print(); }, 800);</script>

  <div style="max-width:780px;margin:0 auto;padding:20px 24px">

    <!-- Header -->
    <div style="border-bottom:3px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:18px;font-weight:700;color:#1e3a5f;letter-spacing:0.02em">CARRIER SAFETY &amp; COMPLIANCE REPORT</div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px">Generated by FleetSight \u2022 Data sourced from FMCSA, SAFER, Socrata &amp; public records</div>
        </div>
        <div style="text-align:right;font-size:10px;color:#6b7280;line-height:1.6">
          <div>${esc(reportDate)}</div>
          <div>${esc(reportTime)}</div>
        </div>
      </div>
    </div>

    ${flagsHtml}

    <!-- Identification -->
    <div class="section-header">Entity Identification</div>
    <table style="width:100%">
      ${row("Legal Name", carrier.legal_name)}
      ${carrier.dba_name ? row("DBA Name", carrier.dba_name) : ""}
      ${row("USDOT Number", carrier.dot_number)}
      ${carrier.docket1 ? row("MC/MX Number", `MC-${carrier.docket1}`) : ""}
      ${row("Entity Type", entityType)}
      ${row("Operating Status", usdotDisplay)}
      ${row("Safety Rating", safetyRating ?? "Not Rated")}
      ${row("Authority Status", authStatus ?? "\u2014")}
      ${activeAuthTypes.length > 0 ? row("Authority Types", activeAuthTypes.join(", ")) : ""}
      ${row("Authority Age", authorityAge(carrier.add_date))}
      ${carrier.add_date ? row("Authority Granted", fmt(carrier.add_date)) : ""}
      ${row("Prior Revocation", carrier.prior_revoke_flag === "Y" ? "YES" : "No")}
      ${row("Out-of-Service Order", hasOos ? "YES \u2014 ACTIVE" : "None")}
    </table>

    <!-- Contact & Address -->
    <div class="section-header">Contact &amp; Address Information</div>
    <table style="width:100%">
      ${carrier.phy_street ? row("Physical Address", [carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(", ")) : ""}
      ${carrier.carrier_mailing_street && carrier.carrier_mailing_street !== carrier.phy_street ? row("Mailing Address", [carrier.carrier_mailing_street, carrier.carrier_mailing_city, carrier.carrier_mailing_state].filter(Boolean).join(", ")) : ""}
      ${carrier.phone ? row("Phone", carrier.phone) : ""}
      ${carrier.cell_phone ? row("Mobile", carrier.cell_phone) : ""}
      ${carrier.email_address ? row("Email", carrier.email_address) : ""}
    </table>

    <!-- Operation Details -->
    <div class="section-header">Operation Classification</div>
    <table style="width:100%">
      ${row("Operation Type", operation)}
      ${row("Power Units", carrier.power_units ?? "0")}
      ${row("Total Drivers", carrier.total_drivers ?? "0")}
      ${carrier.total_cdl ? row("CDL Drivers", carrier.total_cdl) : ""}
      ${row("Hazmat", carrier.hm_ind === "Y" ? "YES \u2014 Authorized" : "No")}
      ${row("SmartWay Partner", smartway ? "Yes" : "No")}
      ${carrier.mcs150_date ? row("MCS-150 Last Updated", fmt(carrier.mcs150_date)) : ""}
    </table>

    <!-- Officers -->
    ${
      carrier.company_officer_1 || carrier.company_officer_2
        ? `<div class="section-header">Company Officers</div>
           <table style="width:100%">
             ${carrier.company_officer_1 ? row("Officer 1", carrier.company_officer_1) : ""}
             ${carrier.company_officer_2 ? row("Officer 2", carrier.company_officer_2) : ""}
           </table>`
        : ""
    }

    <!-- Risk Assessment -->
    <div class="section-header">FleetSight Risk Assessment</div>
    <table style="width:100%">
      ${row("Risk Grade", `${grade} (${score}/100)`)}
      ${row("Inspection OOS Rate", `${oosRate}% overall \u2022 ${vehOosRate}% vehicle \u2022 ${drvOosRate}% driver`)}
      ${row("Crash Summary", `${totalCrashes} crash${totalCrashes !== 1 ? "es" : ""} \u2022 ${totalFatalities} fatal${totalFatalities !== 1 ? "ities" : "ity"} \u2022 ${totalInjuries} injur${totalInjuries !== 1 ? "ies" : "y"} \u2022 ${towAway} tow-away`)}
    </table>

    <!-- Inspection Summary -->
    <div class="section-header">Inspection Summary (24 months)</div>
    <table style="width:100%;margin-bottom:4px">
      ${row("Total Inspections", totalInsp)}
      ${row("Vehicle OOS", `${vehOos} (${vehOosRate}%)`)}
      ${row("Driver OOS", `${drvOos} (${drvOosRate}%)`)}
      ${row("Total OOS", `${totalOos} (${oosRate}%)`)}
    </table>

    ${
      recentInsp.length > 0
        ? `<div style="font-size:10px;font-weight:700;color:#4b5563;margin:10px 0 4px;text-transform:uppercase">Recent Inspections (last ${recentInsp.length})</div>
           <table style="width:100%">
             <tr>
               <th class="th">Date</th>
               <th class="th">State</th>
               <th class="th-center">Level</th>
               <th class="th-center">Veh OOS</th>
               <th class="th-center">Dvr OOS</th>
               <th class="th-center">HM OOS</th>
             </tr>
             ${inspRows}
           </table>`
        : ""
    }

    <!-- Crash History -->
    <div class="section-header">Crash History (24 months)</div>
    <table style="width:100%;margin-bottom:4px">
      ${row("Total Crashes", totalCrashes)}
      ${row("Fatalities", totalFatalities)}
      ${row("Injuries", totalInjuries)}
      ${row("Tow-Away", towAway)}
    </table>

    ${
      recentCrashes.length > 0
        ? `<div style="font-size:10px;font-weight:700;color:#4b5563;margin:10px 0 4px;text-transform:uppercase">Recent Crashes (last ${recentCrashes.length})</div>
           <table style="width:100%">
             <tr>
               <th class="th">Date</th>
               <th class="th">State</th>
               <th class="th-center">Fatalities</th>
               <th class="th-center">Injuries</th>
               <th class="th-center">Tow-Away</th>
             </tr>
             ${crashRows}
           </table>`
        : ""
    }

    <!-- Insurance -->
    ${
      activeInsurance.length > 0
        ? `<div class="section-header">Insurance / Financial Responsibility</div>
           <table style="width:100%">
             <tr>
               <th class="th">Coverage Type</th>
               <th class="th">Insurance Carrier</th>
               <th class="th">Policy Number</th>
               <th class="th">Effective Date</th>
             </tr>
             ${insuranceRows}
           </table>`
        : ""
    }

    <!-- Background Screening -->
    <div class="section-header">Background Screening Status</div>
    <table style="width:100%">
      ${row("OFAC SDN Sanctions", "Check available in FleetSight")}
      ${row("SAM.gov Exclusions", "Check available in FleetSight")}
      ${row("Federal Court Records", "Check available in FleetSight")}
      ${row("OSHA Violations", "Check available in FleetSight")}
      ${row("EPA Enforcement", "Check available in FleetSight")}
      ${row("State Corporate Registry", "Check available in FleetSight")}
    </table>

    <!-- Footer -->
    <div style="border-top:2px solid #1e3a5f;margin-top:24px;padding-top:10px;font-size:9px;color:#6b7280;line-height:1.6">
      <p style="margin:0">
        <strong>DISCLAIMER:</strong> This report was generated by FleetSight on ${esc(reportDate)} at ${esc(reportTime)}. Data sourced from the Federal Motor Carrier Safety Administration (FMCSA) SAFER System, USDOT Registration, Socrata transportation datasets, and public government records. This report is provided for informational and carrier vetting purposes only. FleetSight makes no warranties regarding the accuracy, completeness, or timeliness of data. Always verify carrier operating status and insurance directly with FMCSA before entering into a transportation agreement.
      </p>
      <p style="margin:6px 0 0;font-size:9px;color:#9ca3af">
        USDOT ${esc(carrier.dot_number)}${carrier.docket1 ? ` \u2022 MC-${esc(carrier.docket1)}` : ""} \u2022 fleetsight.vercel.app \u2022 ${esc(reportDate)}
      </p>
    </div>

  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
