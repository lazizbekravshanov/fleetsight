import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "Carrier Fraud Red Flags: 12 Warning Signs Every Broker Should Know",
  description:
    "Double brokering, identity theft, fake authority, and stolen freight. The 12 red flags that separate legitimate carriers from fraud rings — and how to spot them in seconds.",
  openGraph: {
    title: "Carrier Fraud Red Flags — 12 Warning Signs",
    description:
      "12 red flags that expose double brokering, identity theft, fake authority, and freight theft schemes. Free guide from FleetSight.",
    type: "article",
  },
};

export default function CarrierFraudRedFlags() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-0)",
        color: "var(--ink)",
      }}
    >
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
            Fraud
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-04-05"
          >
            April 5, 2026
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
          Carrier Fraud Red Flags: 12 Warning Signs Every Broker Should Know
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          Cargo theft and double brokering have gone industrial. The carriers
          running these schemes know how to look legitimate on paper. They
          register clean authority, file insurance, and answer the phone the
          first three times you call. Then they vanish with the load. Below are
          the 12 highest-signal red flags FleetSight uses to flag suspect
          carriers in seconds — and what each one means.
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
          Identity & Authority Flags
        </h2>

        {[
          {
            num: "1",
            title: "Authority Granted in the Last 90 Days",
            text: "Brand-new authority is not automatically suspicious — every legitimate carrier was new at some point. But fraud rings rotate authority constantly, so a disproportionate share of fraud cases involves entities under three months old. Combined with any other flag in this list, treat new authority as a hard slow-down signal.",
          },
          {
            num: "2",
            title: "Authority Revoked, Then Re-Granted",
            text: "When a carrier's authority is revoked and the same legal entity is granted authority again within months, ask why. The pattern is even worse when a different entity at the same address gets authority right after the revocation — that is the classic chameleon move.",
          },
          {
            num: "3",
            title: "Mismatched Legal Name on Insurance Filing",
            text: "Pull the insurance filing from FMCSA and compare the named insured against the legal name on the carrier's authority. They should match exactly. A subsidiary, DBA, or 'doing business as' on the COI that does not match the FMCSA legal name is a forgery indicator.",
          },
          {
            num: "4",
            title: "Phone Number Routed to VoIP",
            text: "VoIP numbers are not inherently fraudulent — many real businesses use them. But fraud rings use them at much higher rates because they are cheap to spin up and discard. A carrier whose only contact phone is a VoIP, with no landline and no mobile carrier registration, is worth a second look.",
          },
        ].map((flag) => (
          <FlagCard key={flag.num} num={flag.num} title={flag.title} text={flag.text} />
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
          Address & Network Flags
        </h2>

        {[
          {
            num: "5",
            title: "Address Shared with Another Carrier",
            text: "When you geocode the carrier's physical address and find another active carrier at the same suite — particularly if the principals overlap — you are looking at one of the strongest fraud signals there is. Single addresses with three or more authorities are statistically associated with identity-fraud schemes.",
          },
          {
            num: "6",
            title: "Residential or Virtual Office Address",
            text: "A 50-truck fleet does not operate out of a UPS Store. A residential address combined with a fleet size that requires a yard is a sign that the listed address is a mail drop, not a real operation. Cross-reference the address against satellite imagery if you can.",
          },
          {
            num: "7",
            title: "Out-of-State Filing Agent with No Other Footprint",
            text: "A carrier whose process agent, BOC-3 filer, and registered address are all in different states is not unusual on its own. But when those addresses are all linked to a single filing service that handles thousands of new authorities and the carrier has no other operational footprint in any of those states, you are likely looking at an authority mill.",
          },
          {
            num: "8",
            title: "Officers Linked to Multiple Closed Carriers",
            text: "Look up the company officers from the MCS-150 filing. Search those names against historical FMCSA data. Anyone whose name shows up on three or more closed or revoked carriers in the last five years is a known chameleon operator until proven otherwise.",
          },
        ].map((flag) => (
          <FlagCard key={flag.num} num={flag.num} title={flag.title} text={flag.text} />
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
          Behavioral & Operational Flags
        </h2>

        {[
          {
            num: "9",
            title: "Willing to Take Any Load, Anywhere, Cheap",
            text: "Legitimate carriers have lanes, equipment specialties, and a price floor. A 'carrier' that accepts every load board posting at posted rates, regardless of distance or commodity, is either desperate or running a different business model. Both are reasons to dig deeper before tendering.",
          },
          {
            num: "10",
            title: "Refuses to Provide a Direct Driver Phone",
            text: "If the only contact for a tendered load is a dispatch number — and the dispatcher refuses to put you in touch with the actual driver — you cannot verify the load is moving with the carrier you booked. Double brokers will book your load and re-broker it; the 'dispatcher' you are talking to may not work for the listed carrier at all.",
          },
          {
            num: "11",
            title: "Insists on Quick-Pay or Factoring at Pickup",
            text: "Quick-pay and factoring are normal in trucking. But aggressive insistence on paying immediately at pickup — before delivery, before paperwork — is consistent with fraud rings that intend to disappear before delivery. Hold to standard payment terms on first loads with a new carrier.",
          },
          {
            num: "12",
            title: "Zero Inspection History",
            text: "An active motor carrier that has been operating for more than six months should have at least one roadside inspection on file. Zero inspections on a carrier that claims to be running OTR is either a brand-new operation or an entity that does not actually have trucks moving freight. Either possibility deserves verification before you tender.",
          },
        ].map((flag) => (
          <FlagCard key={flag.num} num={flag.num} title={flag.title} text={flag.text} />
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
          How to Use the List
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          A single red flag is not proof of fraud. A single flag is a reason
          to look closer. Two or more flags on the same carrier should escalate
          you from vetting to investigation: pull the corporate filings, call
          the principal directly, and verify the load and equipment in person
          if the value justifies it.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          Three or more flags is a reason to walk away. There are 4.4 million
          registered carriers in the United States. Losing one tender to
          caution is cheap; losing one load to fraud is not.
        </p>

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
            Run all 12 red flags in seconds
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

function FlagCard({ num, title, text }: { num: string; title: string; text: string }) {
  return (
    <div
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
          {num}
        </span>
        {title}
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
        {text}
      </p>
    </div>
  );
}
