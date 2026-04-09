import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "How to Detect Chameleon Carriers: 7 Signals That Expose Reincarnated Fleets",
  description:
    "Chameleon carriers re-register to shed crash history and safety violations. Learn the 7 data signals used to identify them and how to protect your freight.",
  openGraph: {
    title: "How to Detect Chameleon Carriers — 7 Warning Signals",
    description:
      "Chameleon carriers shut down and reopen under new authority to escape safety records. Learn the 7 signals that expose them.",
    type: "article",
  },
};

export default function HowToDetectChameleonCarriers() {
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
            Safety
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-03-18"
          >
            March 18, 2026
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
          How to Detect Chameleon Carriers: 7 Signals That Expose Reincarnated
          Fleets
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          Every year, unsafe motor carriers shut down after catastrophic crashes,
          out-of-service orders, or federal enforcement actions — only to
          re-register under a new name, new DOT number, and new operating
          authority. These are chameleon carriers, and they are one of the most
          dangerous loopholes in U.S. freight safety.
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
          What Is a Chameleon Carrier?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          A chameleon carrier is a trucking company that ceases operations — often
          after receiving an out-of-service order, accumulating severe safety
          violations, or being involved in fatal crashes — and then reopens under
          a different legal entity. The goal is simple: start with a clean
          slate, shedding the safety record that would otherwise prevent them
          from booking loads or obtaining insurance.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          The FMCSA has recognized this as a serious problem. Despite
          regulations intended to prevent it, the sheer volume of carrier
          registrations — over 4.4 million entities — makes manual detection
          nearly impossible. Chameleon carriers exploit this gap.
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
          Why They Are Dangerous
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          When a carrier reincarnates, its crash history, inspection failures,
          and compliance violations vanish from its new record. Brokers,
          shippers, and insurance providers who rely on FMCSA data see a clean
          company. In reality, the same drivers, the same trucks, and the same
          management practices that caused previous incidents are still in
          operation.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          This puts everyone at risk — other drivers on the road, freight
          brokers who face liability, and shippers whose cargo is in the hands
          of operators who have already demonstrated a pattern of unsafe
          behavior.
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
          The 7 Signals FleetSight Uses to Detect Chameleons
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 24 }}>
          FleetSight analyzes seven distinct data signals to identify potential
          chameleon carriers. No single signal is definitive — it is the
          combination that matters.
        </p>

        {/* Signal cards */}
        {[
          {
            num: "1",
            title: "Shared VIN Ratio",
            text: "When a new carrier registers vehicles (VINs) that were previously registered to a defunct carrier, it is a strong indicator of asset transfer. FleetSight calculates the ratio of shared VINs between the new entity and any recently closed carriers. A high ratio — especially above 50% — is a significant red flag.",
          },
          {
            num: "2",
            title: "Temporal Patterns",
            text: "Chameleon carriers often re-register within days or weeks of the previous entity shutting down. FleetSight flags new authority registrations that occur suspiciously close to the closure of a carrier with matching characteristics — same region, same equipment type, similar fleet size.",
          },
          {
            num: "3",
            title: "Concurrent Operations",
            text: "Some chameleon carriers do not wait for the old entity to fully close. They run both the old and new authority simultaneously during a transition period. FleetSight detects overlapping operational windows between related entities.",
          },
          {
            num: "4",
            title: "Address Matching",
            text: "New carriers that register at the same physical address, mailing address, or process agent address as a recently closed carrier raise immediate concern. FleetSight performs fuzzy address matching that accounts for minor formatting differences, suite number changes, and PO box variations.",
          },
          {
            num: "5",
            title: "Name Similarity",
            text: "Chameleon operators often reuse variations of their previous business name, principal names, or DBAs. FleetSight uses similarity scoring to flag entities with names that are close but not identical to recently deactivated carriers — for example, \"Smith Trucking LLC\" becoming \"Smith Transport Inc.\"",
          },
          {
            num: "6",
            title: "OOS Reincarnation",
            text: "When a carrier receives a federal out-of-service order and a new carrier with matching signals appears shortly afterward, that is an OOS reincarnation pattern. FleetSight specifically tracks the timeline between OOS events and new authority grants to flag these cases.",
          },
          {
            num: "7",
            title: "Fleet Absorption",
            text: "Sometimes a chameleon carrier does not create a brand new entity. Instead, they transfer vehicles and drivers to an existing but previously dormant authority. FleetSight detects sudden fleet size increases in previously inactive carriers, especially when the absorbed vehicles match a recently closed operation.",
          },
        ].map((signal) => (
          <div
            key={signal.num}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontSize: 17,
                fontWeight: 600,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {signal.num}
              </span>
              {signal.title}
            </h3>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--ink-soft)",
                margin: 0,
                paddingLeft: 38,
              }}
            >
              {signal.text}
            </p>
          </div>
        ))}

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          Practical Tips for Brokers and Safety Teams
        </h2>
        <ul
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            paddingLeft: 24,
            marginBottom: 16,
          }}
        >
          <li style={{ marginBottom: 10 }}>
            <strong>Always check new carriers before booking.</strong> A carrier
            with authority granted in the last 90 days deserves extra scrutiny.
            Use FleetSight to run a chameleon check before tendering a load.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Look beyond the DOT number.</strong> A clean DOT record
            means nothing if the carrier behind it has a history under a
            different number. Cross-reference addresses, principals, and VINs.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Watch for unusually low insurance.</strong> Chameleon
            carriers sometimes carry minimum required insurance because they
            struggle to get favorable rates given their actual history.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Monitor your carrier network continuously.</strong> A
            carrier that was clean when you onboarded them may develop problems.
            Continuous monitoring catches changes as they happen.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Trust the data, not the pitch.</strong> Chameleon carriers
            can be polished operators with professional websites and
            responsive dispatchers. The data tells the real story.
          </li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          Use FleetSight to Protect Your Freight
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          FleetSight&apos;s chameleon detection runs automatically on every
          carrier lookup. You do not need to manually cross-reference databases
          or maintain your own watchlists. Enter a DOT number and FleetSight
          will tell you if there are chameleon risk signals — for free, with no
          account required.
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
            Check any carrier for chameleon risk — free
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
