import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "FleetSight vs SearchMule: Which Free Carrier Lookup Tool Is Better?",
  description:
    "Both FleetSight and SearchMule are free. But FleetSight adds 7-signal chameleon detection, background checks, AI search, VIN tracking, and TMS integration. See how they compare.",
  openGraph: {
    title: "FleetSight vs SearchMule — Free Carrier Tools Compared",
    description:
      "Two free FMCSA lookup tools compared. FleetSight goes beyond basic data with chameleon detection, background checks, and AI search.",
    type: "article",
  },
};

export default function FleetSightVsSearchMule() {
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
            dateTime="2026-04-01"
          >
            April 1, 2026
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
          FleetSight vs SearchMule: Which Free Carrier Lookup Tool Is Better?
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          SearchMule has earned a following among freight brokers as a
          straightforward, free FMCSA carrier lookup tool. FleetSight is also
          free but aims to go significantly deeper. Both pull from public FMCSA
          data, but they differ in what they do with that data. Here is an
          honest comparison.
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
          What They Share
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Both tools are free to use with no subscription fees. Both pull
          carrier data from FMCSA public datasets, including authority status,
          insurance information, safety ratings, and basic inspection data.
          Neither requires payment or a credit card.
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
                  SearchMule
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Price", "Free", "Free"],
                ["FMCSA/USDOT data", "Yes", "Yes"],
                ["Carrier associations", "Advanced (7-signal)", "Basic"],
                ["Chameleon carrier detection", "Yes (7 signals)", "No"],
                ["Background checks (OFAC, SAM.gov, courts)", "Yes", "No"],
                ["AI-powered search", "Yes", "No"],
                ["Continuous monitoring", "Yes", "No"],
                ["Fleet VIN tracking", "Yes", "No"],
                ["NHTSA recall integration", "Yes", "No"],
                ["TMS integration", "Yes", "No"],
                ["Signup required", "No", "No"],
              ].map(([feature, fs, sm], i) => (
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
                      fontWeight:
                        fs === "Yes" || fs === "Yes (7 signals)" || fs === "Advanced (7-signal)"
                          ? 600
                          : 400,
                      color:
                        fs === "Yes" || fs === "Yes (7 signals)" || fs === "Advanced (7-signal)"
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
                    {sm}
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
          What SearchMule Does Well
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          SearchMule is clean and fast. You enter a DOT number and get a
          straightforward summary of a carrier&apos;s FMCSA data. It shows basic
          carrier associations, which can help you spot connections between
          related entities. For brokers who just need a quick look at authority
          status and insurance, SearchMule is a solid, no-frills option.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Its simplicity is genuinely a strength. There is no learning curve.
          You get what you came for without navigating a complex interface.
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
          Where FleetSight Goes Deeper
        </h2>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: 24,
          }}
        >
          7-Signal Chameleon Detection
        </h3>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          FleetSight analyzes seven distinct data signals to determine whether a
          carrier is a &quot;chameleon&quot; — a company that has shut down and
          re-registered under new authority to escape poor safety records. The
          signals include shared VIN ratios, temporal re-registration patterns,
          concurrent operations, address matching, name similarity analysis,
          out-of-service reincarnation, and fleet absorption patterns.
          SearchMule shows basic associations but does not perform this level of
          analysis.
        </p>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: 24,
          }}
        >
          Background Checks
        </h3>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          FleetSight cross-references carrier principals against OFAC sanctions
          lists, SAM.gov government exclusions, and court records. This is a
          layer of due diligence that SearchMule does not offer and that paid
          tools often charge extra for.
        </p>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: 24,
          }}
        >
          AI Search
        </h3>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Instead of manually navigating data fields, FleetSight lets you
          describe what you are looking for in plain language. Ask a question
          about a carrier and get a direct, sourced answer.
        </p>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: 24,
          }}
        >
          Fleet VIN Tracking and NHTSA Recalls
        </h3>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          FleetSight links individual vehicles in a carrier&apos;s fleet to
          NHTSA recall databases. This gives you visibility into whether the
          trucks hauling your freight have unaddressed safety recalls — data that
          SearchMule does not surface.
        </p>

        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginBottom: 10,
            marginTop: 24,
          }}
        >
          Continuous Monitoring and TMS Integration
        </h3>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          FleetSight offers ongoing monitoring of carriers in your network and
          can integrate with transportation management systems. SearchMule is a
          point-in-time lookup tool without these workflow features.
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
          SearchMule is a good basic tool. If you need a quick, clean FMCSA
          lookup, it gets the job done. There is nothing wrong with using it for
          surface-level checks.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          FleetSight is for teams that need to go beyond surface-level data.
          Chameleon detection, background checks, AI search, VIN tracking, and
          continuous monitoring are features you typically find in paid
          enterprise tools — but FleetSight includes them all for free. If
          carrier safety and fraud prevention are part of your responsibility,
          FleetSight is the more capable choice.
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
