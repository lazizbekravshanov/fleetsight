import { Metadata } from "next";
import { generatePreTripFocus } from "@/lib/inspections/pre-trip";

export const metadata: Metadata = {
  title: "Pre-Trip Focus Sheet | FleetSight",
  robots: { index: false, follow: false },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return "\u2014";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PreTripFocusPage({
  params,
}: {
  params: { vin: string };
}) {
  const { vin } = params;
  const data = await generatePreTripFocus(vin);
  const reportDate = todayFormatted();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="robots" content="noindex, nofollow" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                .no-print { display: none !important; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 0.5in; size: letter; }
              }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: #111827;
                font-size: 13px;
                line-height: 1.5;
                background: #fff;
              }
            `,
          }}
        />
      </head>
      <body>
        {/* Print button */}
        <div className="no-print" style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1000,
          display: "flex",
          gap: 8,
        }}>
          <button
            onClick={() => window.print()}
            style={{
              background: "#1e3a5f",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            PRINT / SAVE AS PDF
          </button>
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 28px" }}>

          {/* ── Header ── */}
          <div style={{
            borderBottom: "3px solid #1e3a5f",
            paddingBottom: 14,
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", letterSpacing: "0.01em" }}>
                  PRE-TRIP FOCUS SHEET
                </div>
                <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>
                  VIN: <span style={{ fontFamily: "monospace", fontWeight: 600, letterSpacing: "0.03em" }}>{data.vin}</span>
                </div>
                {data.dotNumber && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                    USDOT: {data.dotNumber}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{reportDate}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                  Period: {fmtDate(data.period.start)} &ndash; {fmtDate(data.period.end)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats Bar ── */}
          <div style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            border: "1px solid #d1d5db",
          }}>
            <StatCell
              label="Total Inspections"
              value={String(data.totalInspections)}
            />
            <StatCell
              label="Clean Inspections"
              value={String(data.cleanInspections)}
            />
            <StatCell
              label="Current Clean Rate"
              value={pct(data.currentCleanRate)}
              highlight={data.currentCleanRate < 0.7 ? "warn" : undefined}
            />
            <StatCell
              label="Projected Clean Rate"
              value={pct(data.projectedCleanRate)}
              highlight={data.projectedCleanRate > data.currentCleanRate ? "good" : undefined}
              last
            />
          </div>

          {/* ── Improvement callout ── */}
          {data.projectedCleanRate > data.currentCleanRate && (
            <div style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 12,
              color: "#166534",
              fontWeight: 500,
            }}>
              Addressing the top focus items below could improve the clean inspection rate
              from <strong>{pct(data.currentCleanRate)}</strong> to <strong>{pct(data.projectedCleanRate)}</strong>.
            </div>
          )}

          {/* ── Focus Items ── */}
          {data.focusItems.length === 0 ? (
            <div style={{
              padding: "48px 0",
              textAlign: "center",
              color: "#166534",
            }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                No violation history for this vehicle.
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Standard pre-trip inspection procedures apply.
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                background: "#1e3a5f",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                padding: "5px 8px",
                marginBottom: 0,
              }}>
                Focus Items &mdash; Ranked by Frequency
              </div>

              {data.focusItems.map((item, idx) => (
                <div
                  key={item.code}
                  style={{
                    border: "1px solid #d1d5db",
                    borderTop: idx === 0 ? "1px solid #d1d5db" : "none",
                    padding: "14px 14px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Rank circle */}
                    <div style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#1e3a5f",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {item.rank}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Violation header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                            {item.code} &mdash; {item.description}
                          </div>
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
                            Group: {item.group}
                          </div>
                        </div>
                      </div>

                      {/* Check & Fix */}
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#1e3a5f",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            width: 44,
                            flexShrink: 0,
                            paddingTop: 1,
                          }}>
                            CHECK:
                          </span>
                          <span style={{ fontSize: 12, color: "#374151" }}>
                            {item.checkItem}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#166534",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            width: 44,
                            flexShrink: 0,
                            paddingTop: 1,
                          }}>
                            FIX:
                          </span>
                          <span style={{ fontSize: 12, color: "#374151" }}>
                            {item.fixAction}
                          </span>
                        </div>
                      </div>

                      {/* Metadata line */}
                      <div style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: "#6b7280",
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: 6,
                      }}>
                        Flagged <span style={{ fontWeight: 600, color: "#dc2626" }}>
                          {item.count} time{item.count !== 1 ? "s" : ""}
                        </span>
                        {item.oosCount > 0 && (
                          <span style={{ color: "#dc2626" }}>
                            {" "}({item.oosCount} OOS)
                          </span>
                        )}
                        {item.lastViolationDate && (
                          <>
                            {" "}&middot; Last: {fmtDate(item.lastViolationDate)}
                            {item.lastViolationLocation && (
                              <> @ {item.lastViolationLocation}</>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Footer ── */}
          <div style={{
            borderTop: "2px solid #1e3a5f",
            marginTop: 28,
            paddingTop: 10,
            fontSize: 9,
            color: "#6b7280",
            lineHeight: 1.6,
          }}>
            <p>
              Generated by FleetSight &mdash; {reportDate}.
              This focus sheet is based on FMCSA inspection and violation data
              for the specified vehicle. It is intended as a driver pre-trip aid
              and does not replace required DVIR or regulatory inspection procedures.
            </p>
            <p style={{ marginTop: 4, color: "#9ca3af" }}>
              VIN: {data.vin}
              {data.dotNumber ? <> &bull; USDOT: {data.dotNumber}</> : null}
              {" "}&bull; fleetsight.vercel.app &bull; {reportDate}
            </p>
          </div>

        </div>
      </body>
    </html>
  );
}

// ---------------------------------------------------------------------------
// StatCell component
// ---------------------------------------------------------------------------

function StatCell({
  label,
  value,
  highlight,
  last,
}: {
  label: string;
  value: string;
  highlight?: "warn" | "good";
  last?: boolean;
}) {
  const valueColor =
    highlight === "warn"
      ? "#dc2626"
      : highlight === "good"
        ? "#166534"
        : "#111827";

  return (
    <div style={{
      flex: 1,
      padding: "10px 12px",
      borderRight: last ? "none" : "1px solid #d1d5db",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        color: "#6b7280",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 700,
        color: valueColor,
        marginTop: 2,
      }}>
        {value}
      </div>
    </div>
  );
}
