import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "FleetSight vs Carrier411: Free AI Carrier Verification vs Paid Legacy Tool",
  description:
    "Compare FleetSight and Carrier411 side by side. FleetSight offers free chameleon detection, AI search, background checks, and VIN tracking. Carrier411 charges $35+/month.",
  openGraph: {
    title: "FleetSight vs Carrier411 — Feature Comparison",
    description:
      "Free AI-powered carrier verification vs a paid legacy service. See how FleetSight and Carrier411 compare on features, pricing, and depth.",
    type: "article",
  },
};

export default function FleetSightVsCarrier411() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        color: "var(--ink)",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            FleetSight
          </Link>
          <Link
            href="/blog"
            style={{
              fontSize: 14,
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            All Articles
          </Link>
        </div>
      </header>

      {/* Article */}
      <article
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--accent)",
              background: "var(--accent-soft)",
              padding: "3px 10px",
              borderRadius: 6,
            }}
          >
            Comparison
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-03-30"
          >
            March 30, 2026
          </time>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 20,
          }}
        >
          FleetSight vs Carrier411: Free AI Carrier Verification Compared to
          Paid
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          Carrier411 has been a staple in freight broker offices for years. It
          provides FreightGuard reports, CARB compliance data, and carrier
          monitoring for a monthly subscription. FleetSight is a newer
          alternative that takes a different approach: free access, no signup
          required, and AI-powered analysis. This article compares both
          platforms fairly so you can choose the right tool for your workflow.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          Pricing and Access
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Carrier411 operates on a subscription model starting at $35 per month,
          with higher tiers for additional features. Access requires account
          creation and payment before you can look up a single carrier.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          FleetSight is completely free and requires no account. Enter a DOT
          number or carrier name and get results immediately. There are no
          paywalls, no trial periods, and no feature gates.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          Feature Comparison
        </h2>

        {/* Comparison table */}
        <div
          style={{
            overflowX: "auto",
            marginBottom: 32,
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 15,
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Feature
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                    color: "var(--accent)",
                  }}
                >
                  FleetSight
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: "12px 16px",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  Carrier411
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Price", "Free", "$35+/mo"],
                ["Signup required", "No", "Yes"],
                ["FMCSA/USDOT data", "Yes", "Yes"],
                ["Chameleon carrier detection", "Yes (7 signals)", "No"],
                ["AI-powered search", "Yes", "No"],
                ["Background checks (OFAC, SAM.gov, courts)", "Yes", "No"],
                ["VIN tracking with NHTSA recalls", "Yes", "No"],
                ["FreightGuard reports", "No", "Yes"],
                ["CARB compliance data", "No", "Yes"],
                ["Continuous monitoring", "Yes", "Yes (paid tier)"],
                ["TMS integration", "Yes", "Limited"],
              ].map(([feature, fs, c411], i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom:
                      i < 10 ? "1px solid var(--border)" : "none",
                    background:
                      i % 2 === 0 ? "var(--surface-1)" : "transparent",
                  }}
                >
                  <td style={{ padding: "10px 16px" }}>{feature}</td>
                  <td
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      fontWeight: fs === "Yes" || fs === "Yes (7 signals)" || fs === "Free" || fs === "No" && feature === "Signup required" ? 600 : 400,
                      color:
                        fs === "Free" || fs === "Yes" || fs === "Yes (7 signals)" || (fs === "No" && feature === "Signup required")
                          ? "var(--accent)"
                          : "var(--ink-soft)",
                    }}
                  >
                    {fs}
                  </td>
                  <td
                    style={{
                      padding: "10px 16px",
                      textAlign: "center",
                      color: "var(--ink-soft)",
                    }}
                  >
                    {c411}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          What Carrier411 Does Well
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Carrier411 has built a strong community-driven reporting system.
          FreightGuard reports let brokers flag carriers for double-brokering,
          cargo theft, and other issues. These reports are contributed by other
          subscribers, creating a collaborative intelligence network.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Carrier411 also offers CARB compliance checks, which matter for
          carriers operating in California. This is a niche but important feature
          that FleetSight does not currently provide.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          Where FleetSight Goes Further
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          <strong>Chameleon carrier detection</strong> is FleetSight&apos;s
          standout capability. Using 7 distinct data signals — including shared
          VIN ratios, temporal re-registration patterns, address matching, and
          out-of-service reincarnation tracking — FleetSight can identify
          carriers that have shut down and reopened under new authority to escape
          their safety history. Carrier411 does not offer this.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          <strong>AI-powered search</strong> lets you describe what you are
          looking for in plain language. Instead of hunting through menus,
          you type a question and get a direct answer sourced from FMCSA data.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          <strong>Background checks</strong> cross-reference carrier principals
          against OFAC sanctions lists, SAM.gov exclusions, and court records.
          This layer of due diligence is not available in Carrier411.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          <strong>Fleet VIN tracking</strong> links individual vehicles to NHTSA
          recall databases, giving you visibility into whether a carrier&apos;s
          trucks have unaddressed safety recalls.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          The Bottom Line
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Carrier411 is a proven tool with a loyal user base and useful
          community-driven reports. If FreightGuard data and CARB compliance are
          critical to your workflow, it delivers value.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          However, FleetSight offers significantly more features at no cost.
          Chameleon detection, AI search, background checks, and VIN tracking
          are all included for free with no account required. For brokers and
          safety teams looking for comprehensive carrier intelligence without a
          subscription, FleetSight is the stronger choice.
        </p>

        {/* CTA */}
        <div
          style={{
            background: "var(--accent-soft)",
            border: "1px solid var(--accent)",
            borderRadius: 12,
            padding: "28px 32px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Try FleetSight free — no signup required
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "#fff",
              padding: "12px 28px",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Search a Carrier Now
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "32px 24px",
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-muted)",
        }}
      >
        <p style={{ margin: "0 0 8px" }}>
          <Link
            href="/blog"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Back to all articles
          </Link>
        </p>
        <p style={{ margin: 0 }}>
          FleetSight — AI-powered carrier verification.{" "}
          <Link
            href="/"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Search carriers now
          </Link>
        </p>
      </footer>
    </div>
  );
}
