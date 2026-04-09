import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "How to Vet a Carrier: A Step-by-Step Playbook for Brokers and Shippers",
  description:
    "A practical 8-step playbook for vetting any motor carrier before tendering a load. Authority, insurance, safety scores, fraud signals, and what to do when something looks off.",
  openGraph: {
    title: "How to Vet a Carrier — Step-by-Step Playbook",
    description:
      "Learn the 8-step carrier vetting process every broker should run before tendering. Free guide from FleetSight.",
    type: "article",
  },
};

export default function HowToVetACarrier() {
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
            Vetting
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-04-07"
          >
            April 7, 2026
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
          How to Vet a Carrier: A Step-by-Step Playbook for Brokers and Shippers
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          A bad carrier can cost you a load, an insurance claim, a customer, or
          a lawsuit. A few minutes of vetting before you dispatch can prevent
          all four. This is the eight-step playbook FleetSight recommends for
          every new carrier — and the quick re-check we recommend for repeat
          carriers before each load.
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
          Why Vetting Still Fails
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Most brokers know to check authority and insurance. The problem is
          that the checks usually stop there. Fraud rings know exactly which
          boxes you tick. They register clean authority, file a current COI,
          and pass the surface inspection. Two weeks later the load is gone and
          the phone is dead.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Real vetting goes deeper. It looks at history, identity, network
          connections, and behavioral signals — not just current status. The
          eight steps below cover all four.
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
          The 8-Step Vetting Playbook
        </h2>

        {[
          {
            num: "1",
            title: "Verify FMCSA Authority",
            text: "Pull the carrier's FMCSA record by USDOT or MC number. Confirm authority is ACTIVE (not pending, revoked, or out-of-service), confirm the entity type matches the work (motor carrier vs broker vs freight forwarder), and verify the operating status date. Anything granted in the last 90 days deserves extra scrutiny.",
          },
          {
            num: "2",
            title: "Confirm Insurance on File",
            text: "Check that primary auto liability is current and meets your minimum (typically $1M for general freight, $5M for hazmat). Cross-reference the insurer name and policy number against the COI the carrier sends you. A current FMCSA filing is good. A current FMCSA filing that matches an independently-fetched COI is better.",
          },
          {
            num: "3",
            title: "Pull the Safety Snapshot",
            text: "Look at the carrier's BASIC scores, out-of-service rates, and crash counts. A small carrier with two crashes in 12 months is statistically very different from a 500-truck fleet with two crashes. Normalize for fleet size before drawing conclusions.",
          },
          {
            num: "4",
            title: "Walk the Inspection History",
            text: "Inspections are the highest-frequency truth signal you have on a carrier. Look for trends, not totals: a rising OOS rate, repeated brake or hours-of-service violations, or inspections concentrated in one corridor. A clean inspection from this month carries more weight than ten clean inspections from three years ago.",
          },
          {
            num: "5",
            title: "Run Identity Checks on Principals",
            text: "Get the names of officers and principals from the carrier's MCS-150 filing. Search for those names against OFAC sanctions, SAM.gov exclusions, federal court records, and any prior carriers they have been associated with. A principal who shows up on three closed carriers in five years is a chameleon signal.",
          },
          {
            num: "6",
            title: "Check the Address and Network",
            text: "Geocode the physical address. A residential address, a UPS Store, or a virtual office is not a disqualifier on its own — but it is when combined with a small fleet size, a brand-new authority, and a carrier name that sounds generic. Cross-check the address against other carriers; a single address with multiple authorities is one of the strongest fraud signals there is.",
          },
          {
            num: "7",
            title: "Look for Chameleon Signals",
            text: "A chameleon carrier is one that re-registered after being shut down, to shed crash history or OOS orders. Check whether the principals, addresses, phone numbers, or VINs on this carrier match a recently closed entity. FleetSight automates this with 7 chameleon signals — but you can run a manual version with FMCSA data alone.",
          },
          {
            num: "8",
            title: "Document Everything",
            text: "When you onboard a carrier, snapshot every check you ran: authority status, COI, safety scores, principal lookups, address verification. If there is ever a claim or audit, this is the file your attorney will ask for. A vetting process you cannot prove you ran is a vetting process you might as well not have run.",
          },
        ].map((step) => (
          <div
            key={step.num}
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
                {step.num}
              </span>
              {step.title}
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
              {step.text}
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
          What to Do When Something Looks Off
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Vetting catches problems. The next question is what you do when you
          find one. Our recommendation: rank findings into three buckets.
        </p>
        <ul
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            paddingLeft: 24,
            marginBottom: 16,
          }}
        >
          <li style={{ marginBottom: 8 }}>
            <strong>Hard stop.</strong> Authority is not active, insurance is
            lapsed, the carrier appears on OFAC, or the address is shared with
            three other carriers. Do not load. There is nothing to discuss.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Conditional.</strong> The carrier is technically eligible
            but has elevated signals — a recent authority change, a single
            chameleon signal, an OOS rate above the national average. Approve
            for low-value or low-liability loads only, and recheck before each
            tender.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Clear.</strong> All eight steps pass cleanly. Document the
            check, set a re-vet date (we recommend 90 days), and dispatch.
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
          The Re-Vet Cadence
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Vetting once at onboarding is not enough. A carrier that was clean in
          January can be out-of-service in June. Insurance lapses. Authority
          gets revoked. Crashes happen. Build a re-vet cadence into your
          process — at minimum, before any high-value or hazmat tender, and on
          a recurring 30-to-90-day schedule for repeat carriers.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          FleetSight surfaces these changes automatically when you save a
          carrier to your watchlist — but the discipline matters more than the
          tool. Build the cadence first.
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
            Run all 8 vetting steps in under a minute
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
          FleetSight — free FMCSA carrier intelligence.{" "}
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
