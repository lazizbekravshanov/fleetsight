import { notFound } from "next/navigation";
import { AutoPrint } from "./auto-print";
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
): { score: number; grade: "A" | "B" | "C" | "D" | "F" } {
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
  if (!addDate) return "—";
  const days = Math.floor((Date.now() - new Date(addDate).getTime()) / 86400000);
  if (days < 30) return `${days} days`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  return `${years}y ${months}m`;
}

function fmt(date: string | null | undefined): string {
  if (!date) return "—";
  try { return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return date; }
}

/* ── Page ────────────────────────────────────────────────────────── */

export default async function CarrierReportPage({
  params,
}: {
  params: { dotNumber: string };
}) {
  const dotNum = parseInt(params.dotNumber, 10);
  if (isNaN(dotNum)) notFound();

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

  if (!carrier) notFound();

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
        const ca = (entry as Record<string, unknown>).carrierAuthority as Record<string, unknown> | undefined;
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
  const totalInsp = inspections.length;
  const vehOos = inspections.reduce((s, i) => s + parseInt(i.vehicle_oos_total ?? "0", 10), 0);
  const drvOos = inspections.reduce((s, i) => s + parseInt(i.driver_oos_total ?? "0", 10), 0);
  const totalOos = inspections.reduce((s, i) => s + parseInt(i.oos_total ?? "0", 10), 0);
  const oosRate = totalInsp > 0 ? ((totalOos / totalInsp) * 100).toFixed(1) : "—";
  const vehOosRate = totalInsp > 0 ? ((vehOos / totalInsp) * 100).toFixed(1) : "—";
  const drvOosRate = totalInsp > 0 ? ((drvOos / totalInsp) * 100).toFixed(1) : "—";

  const totalCrashes = crashes.length;
  const totalFatalities = crashes.reduce((s, c) => s + parseInt(c.fatalities ?? "0", 10), 0);
  const totalInjuries = crashes.reduce((s, c) => s + parseInt(c.injuries ?? "0", 10), 0);

  /* ── Insurance ── */
  const activeInsurance = insurance.filter((i) => {
    if (!i.effective_date) return true;
    return new Date(i.effective_date) <= new Date();
  }).slice(0, 6);

  /* ── Risk grade ── */
  const { score, grade } = quickGrade(
    carrier.status_code,
    usdotStatus,
    carrier.prior_revoke_flag,
    carrier.add_date
  );
  const smartway = isSmartWayPartner(carrier.legal_name);
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const S = {
    page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#fff", color: "#111827", margin: 0, padding: 0, fontSize: "13px", lineHeight: "1.5" } as React.CSSProperties,
    docHeader: { borderBottom: "2px solid #111827", padding: "24px 48px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" } as React.CSSProperties,
    wordmark: { fontSize: "11px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.18em", color: "#6366f1" },
    reportTitle: { fontSize: "17px", fontWeight: 600, marginTop: "4px", color: "#111827" },
    meta: { textAlign: "right" as const, fontSize: "11px", color: "#9ca3af", lineHeight: "1.6" },
    body: { padding: "36px 48px 48px", maxWidth: "760px", margin: "0 auto" } as React.CSSProperties,
    heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", gap: "24px" } as React.CSSProperties,
    carrierName: { fontSize: "26px", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" } as React.CSSProperties,
    dba: { fontSize: "14px", color: "#6b7280", marginTop: "2px" } as React.CSSProperties,
    dotLine: { fontSize: "13px", color: "#9ca3af", marginTop: "8px" } as React.CSSProperties,
    gradeBox: { border: `2px solid ${gradeColor(grade)}`, borderRadius: "10px", padding: "12px 20px", textAlign: "center" as const, minWidth: "80px", flexShrink: 0 } as React.CSSProperties,
    gradeLabel: { fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "#9ca3af" },
    gradeValue: { fontSize: "40px", fontWeight: 800, color: gradeColor(grade), lineHeight: "1.1" } as React.CSSProperties,
    gradeScore: { fontSize: "11px", color: "#9ca3af", marginTop: "2px" } as React.CSSProperties,
    statusGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", marginBottom: "32px" } as React.CSSProperties,
    statusBox: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px" } as React.CSSProperties,
    statusBoxLabel: { fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "4px" } as React.CSSProperties,
    sectionTitle: { fontSize: "10px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: "#6b7280", borderBottom: "1px solid #e5e7eb", paddingBottom: "6px", marginBottom: "14px", marginTop: "28px" } as React.CSSProperties,
    table: { width: "100%", borderCollapse: "collapse" as const },
    tdLabel: { padding: "5px 0", color: "#9ca3af", width: "38%", verticalAlign: "top" as const, fontSize: "12px" } as React.CSSProperties,
    tdValue: { padding: "5px 0", color: "#111827", fontWeight: 500, fontSize: "12px" } as React.CSSProperties,
    statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } as React.CSSProperties,
    statBox: { background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "14px 16px" } as React.CSSProperties,
    statNum: { fontSize: "24px", fontWeight: 700, color: "#111827", lineHeight: 1 } as React.CSSProperties,
    statLbl: { fontSize: "11px", color: "#9ca3af", marginTop: "4px" } as React.CSSProperties,
    checkGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } as React.CSSProperties,
    checkBox: { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px" } as React.CSSProperties,
    footer: { borderTop: "1px solid #e5e7eb", padding: "16px 48px", fontSize: "10px", color: "#9ca3af", lineHeight: "1.6" } as React.CSSProperties,
    printBtn: { position: "fixed" as const, top: "20px", right: "20px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", zIndex: 1000, boxShadow: "0 2px 8px rgba(99,102,241,0.3)" },
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{carrier.legal_name} — FleetSight Vetting Report</title>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 0.6in 0.5in; size: letter; }
          }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; }
        `}</style>
      </head>
      <body style={S.page}>
        <AutoPrint />

        {/* Print button — hidden when printing */}
        <button
          className="no-print"
          style={S.printBtn}
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
        >
          Print / Save PDF
        </button>

        {/* Document header */}
        <div style={S.docHeader}>
          <div>
            <div style={S.wordmark}>FleetSight</div>
            <div style={S.reportTitle}>Carrier Vetting Report</div>
          </div>
          <div style={S.meta}>
            <div>Generated {reportDate}</div>
            <div>fleetsight.vercel.app</div>
          </div>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* Hero: carrier name + grade */}
          <div style={S.heroRow}>
            <div style={{ minWidth: 0 }}>
              <h1 style={S.carrierName}>{carrier.legal_name}</h1>
              {carrier.dba_name && <div style={S.dba}>DBA: {carrier.dba_name}</div>}
              <div style={S.dotLine}>
                USDOT {carrier.dot_number}
                {carrier.docket1 && ` · MC-${carrier.docket1}`}
                {carrier.phy_state && ` · ${carrier.phy_state}`}
              </div>
              <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                {smartway && <Tag color="#059669">SmartWay Partner</Tag>}
                {carrier.hm_ind === "Y" && <Tag color="#d97706">Hazmat Authorized</Tag>}
                {carrier.prior_revoke_flag === "Y" && <Tag color="#dc2626">Prior Revocation</Tag>}
                {hasOos && <Tag color="#dc2626">Active OOS Order</Tag>}
                {carrier.add_date && (() => {
                  const days = Math.floor((Date.now() - new Date(carrier.add_date!).getTime()) / 86400000);
                  return days < 90 ? <Tag color="#dc2626">New Authority ({days}d)</Tag>
                    : days < 180 ? <Tag color="#d97706">Recent Authority</Tag>
                    : null;
                })()}
              </div>
            </div>
            <div style={S.gradeBox}>
              <div style={S.gradeLabel}>Risk Grade</div>
              <div style={S.gradeValue}>{grade}</div>
              <div style={S.gradeScore}>{score}/100</div>
            </div>
          </div>

          {/* Status row */}
          <div style={S.statusGrid}>
            <StatusBox
              label="USDOT Status"
              value={usdotStatus ?? (carrier.status_code === "A" ? "ACTIVE" : "INACTIVE")}
              color={statusColor(usdotStatus ?? (carrier.status_code === "A" ? "AUTHORIZED" : null))}
            />
            <StatusBox
              label="Authority Status"
              value={authStatus ?? "—"}
              color={statusColor(authStatus)}
            />
            <StatusBox
              label="Safety Rating"
              value={safetyRating ?? "Not Rated"}
              color={safetyRating === "Satisfactory" ? "#059669" : safetyRating === "Unsatisfactory" ? "#dc2626" : "#6b7280"}
            />
            <StatusBox
              label="Authority Age"
              value={authorityAge(carrier.add_date)}
              color="#111827"
            />
          </div>

          {/* Carrier Information */}
          <div style={S.sectionTitle}>Carrier Information</div>
          <table style={S.table}>
            <tbody>
              {carrier.phy_street && (
                <DataRow label="Physical Address" value={[carrier.phy_street, carrier.phy_city, carrier.phy_state, carrier.phy_zip].filter(Boolean).join(", ")} S={S} />
              )}
              {carrier.carrier_mailing_street && carrier.carrier_mailing_street !== carrier.phy_street && (
                <DataRow label="Mailing Address" value={[carrier.carrier_mailing_street, carrier.carrier_mailing_city, carrier.carrier_mailing_state].filter(Boolean).join(", ")} S={S} />
              )}
              {carrier.phone && <DataRow label="Phone" value={carrier.phone} S={S} />}
              {carrier.cell_phone && <DataRow label="Mobile" value={carrier.cell_phone} S={S} />}
              {carrier.email_address && <DataRow label="Email" value={carrier.email_address} S={S} />}
              {(carrier.company_officer_1 || carrier.company_officer_2) && (
                <DataRow label="Officers" value={[carrier.company_officer_1, carrier.company_officer_2].filter(Boolean).join(" · ")} S={S} />
              )}
              <DataRow label="Entity Type" value={[carrier.business_org_desc, carrier.carrier_operation === "A" ? "Interstate" : carrier.carrier_operation === "B" ? "Intrastate" : null].filter(Boolean).join(" · ") || "—"} S={S} />
              <DataRow label="Power Units" value={carrier.power_units ?? "—"} S={S} />
              <DataRow label="Total Drivers" value={carrier.total_drivers ?? "—"} S={S} />
              {carrier.total_cdl && <DataRow label="CDL Drivers" value={carrier.total_cdl} S={S} />}
              {carrier.docket1 && (
                <DataRow label="MC Docket" value={`MC-${carrier.docket1} (${carrier.docket1_status_code === "A" ? "Active" : carrier.docket1_status_code ?? "—"})`} S={S} />
              )}
              {carrier.add_date && <DataRow label="Authority Granted" value={fmt(carrier.add_date)} S={S} />}
              {carrier.mcs150_date && <DataRow label="MCS-150 Filed" value={fmt(carrier.mcs150_date)} S={S} />}
            </tbody>
          </table>

          {/* Safety Performance */}
          <div style={S.sectionTitle}>Safety Performance</div>
          <div style={S.statsGrid}>
            <StatBox num={totalInsp} label="Total Inspections" S={S} />
            <StatBox
              num={`${oosRate}%`}
              label="Overall OOS Rate"
              S={S}
              alert={parseFloat(oosRate) > 20}
            />
            <StatBox num={totalCrashes} label="Crashes Reported" S={S} alert={totalCrashes > 5} />
            <StatBox
              num={`${vehOosRate}%`}
              label="Vehicle OOS Rate"
              S={S}
              alert={parseFloat(vehOosRate) > 20}
            />
            <StatBox
              num={`${drvOosRate}%`}
              label="Driver OOS Rate"
              S={S}
              alert={parseFloat(drvOosRate) > 20}
            />
            <StatBox
              num={totalFatalities}
              label={`Fatalities · ${totalInjuries} Injured`}
              S={S}
              alert={totalFatalities > 0}
            />
          </div>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px" }}>
            Based on {totalInsp} inspection record{totalInsp !== 1 ? "s" : ""} and {totalCrashes} crash report{totalCrashes !== 1 ? "s" : ""} from FMCSA data.
          </p>

          {/* Insurance */}
          {activeInsurance.length > 0 && (
            <>
              <div style={S.sectionTitle}>Insurance Coverage</div>
              <table style={{ ...S.table, fontSize: "12px" }}>
                <thead>
                  <tr>
                    {["Coverage Type", "Carrier", "Policy No.", "Effective"].map((h) => (
                      <th key={h} style={{ textAlign: "left" as const, padding: "5px 8px 5px 0", color: "#9ca3af", fontWeight: 600, fontSize: "10px", textTransform: "uppercase" as const, letterSpacing: "0.06em", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeInsurance.map((ins, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "6px 8px 6px 0", color: "#374151" }}>{ins.mod_col_1 ?? ins.ins_form_code ?? "—"}</td>
                      <td style={{ padding: "6px 8px 6px 0", color: "#374151" }}>{ins.name_company ?? "—"}</td>
                      <td style={{ padding: "6px 8px 6px 0", color: "#6b7280", fontFamily: "monospace", fontSize: "11px" }}>{ins.policy_no ?? "—"}</td>
                      <td style={{ padding: "6px 8px 6px 0", color: "#6b7280" }}>{fmt(ins.effective_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Background Screening */}
          <div style={S.sectionTitle}>Background Screening Summary</div>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "14px", marginTop: "-10px" }}>
            Status indicators from OFAC SDN, SAM.gov, and federal court databases. Run full Background tab for detailed findings.
          </p>
          <div style={S.checkGrid}>
            <CheckBox label="OFAC Sanctions" status="Run check" neutral S={S} />
            <CheckBox label="SAM.gov Exclusions" status="Run check" neutral S={S} />
            <CheckBox label="Federal Court Records" status="Run check" neutral S={S} />
            <CheckBox label="Bankruptcy Records" status="Run check" neutral S={S} />
            <CheckBox label="OSHA Violations" status="Run check" neutral S={S} />
            <CheckBox label="EPA Enforcement" status="Run check" neutral S={S} />
          </div>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "10px" }}>
            Full background check with officer profiles, state registrations, and sanctions screening is available in the FleetSight platform.
          </p>

          {/* Authority types */}
          {activeAuthTypes.length > 0 && (
            <>
              <div style={S.sectionTitle}>Active Operating Authority</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
                {activeAuthTypes.map((t) => (
                  <span key={t} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "6px 14px", fontSize: "12px", fontWeight: 600, color: "#15803d" }}>
                    {t} Authority
                  </span>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div style={S.footer}>
          <p style={{ margin: 0 }}>
            This report was generated by <strong>FleetSight</strong> on {reportDate}. Data sourced from the FMCSA SAFER System, Socrata transportation datasets, and public government records. For informational and verification purposes only. FleetSight makes no warranties regarding data accuracy or completeness. Always verify carrier status directly with FMCSA before entering a load agreement.
          </p>
          <p style={{ margin: "6px 0 0", color: "#d1d5db" }}>
            USDOT {carrier.dot_number} · fleetsight.vercel.app · {reportDate}
          </p>
        </div>

      </body>
    </html>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ border: `1px solid ${color}22`, background: `${color}11`, color, borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontWeight: 600 }}>
      {children}
    </span>
  );
}

function StatusBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "4px" }}>
        {label}
      </div>
      <div style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function DataRow({ label, value, S }: { label: string; value: string; S: Record<string, React.CSSProperties> }) {
  return (
    <tr style={{ borderBottom: "1px solid #f9fafb" }}>
      <td style={S.tdLabel}>{label}</td>
      <td style={S.tdValue}>{value}</td>
    </tr>
  );
}

function StatBox({ num, label, S, alert }: { num: string | number; label: string; S: Record<string, React.CSSProperties>; alert?: boolean }) {
  return (
    <div style={{ ...S.statBox, ...(alert ? { border: "1px solid #fecaca", background: "#fff5f5" } : {}) }}>
      <div style={{ ...S.statNum, ...(alert ? { color: "#dc2626" } : {}) }}>{num}</div>
      <div style={S.statLbl}>{label}</div>
    </div>
  );
}

function CheckBox({ label, status, neutral, S }: { label: string; status: string; neutral?: boolean; S: Record<string, React.CSSProperties> }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 14px" }}>
      <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#9ca3af" }}>{label}</div>
      <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px", color: neutral ? "#9ca3af" : "#059669" }}>
        {neutral ? "—" : `✓ ${status}`}
      </div>
    </div>
  );
}
