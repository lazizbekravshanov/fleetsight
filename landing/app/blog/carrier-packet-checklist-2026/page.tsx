import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Carrier Packet Checklist 2026: Everything You Need on File",
  description:
    "The 2026 carrier packet checklist — every document, certificate, and verification step required to onboard a new carrier without compliance gaps. Updated for current FMCSA requirements.",
  openGraph: {
    title: "Carrier Packet Checklist 2026 — Complete Onboarding List",
    description:
      "Every document and verification step required to onboard a motor carrier in 2026. Free downloadable checklist from FleetSight.",
    type: "article",
  },
};

export default function CarrierPacketChecklist2026() {
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
            Onboarding
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-04-06"
          >
            April 6, 2026
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
          Carrier Packet Checklist 2026: Everything You Need on File
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          A carrier packet is the file you build at onboarding to prove a motor
          carrier is who they say they are, is legally allowed to haul, is
          adequately insured, and meets your minimum safety standards. Done
          right, it protects you in claims, audits, and lawsuits. Done lazily,
          it leaves gaps that fraud rings and plaintiff attorneys both know how
          to exploit. This is the 2026 version of the checklist FleetSight
          recommends.
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
          Section 1 — Identity & Authority
        </h2>

        {[
          "Signed broker-carrier agreement (or shipper-carrier contract) with current date",
          "W-9 with matching legal name and EIN",
          "Copy of current FMCSA operating authority (MC certificate or equivalent)",
          "USDOT number with verified ACTIVE status pulled directly from FMCSA, not from the carrier",
          "Articles of incorporation or LLC formation document",
          "Verified business address, geocoded against satellite imagery for fleets larger than 5 trucks",
        ].map((item, i) => (
          <ChecklistItem key={`s1-${i}`} text={item} />
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
          Section 2 — Insurance
        </h2>

        {[
          "Certificate of Insurance (COI) listing your company as certificate holder",
          "Primary auto liability — at least $1,000,000 (general freight) or $5,000,000 (hazmat)",
          "Cargo coverage — at least $100,000 per load, higher if your typical load value exceeds it",
          "General liability of at least $1,000,000",
          "Workers' compensation in every state the carrier operates in (or a valid waiver)",
          "Independently verified against the FMCSA insurance filing — not just the COI the carrier sent you",
          "Reefer breakdown coverage for any temperature-controlled freight",
        ].map((item, i) => (
          <ChecklistItem key={`s2-${i}`} text={item} />
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
          Section 3 — Safety & Compliance
        </h2>

        {[
          "Current safety rating (Satisfactory, Conditional, Unrated) from the FMCSA SAFER system",
          "BASIC scores for the previous 24 months — flag any category above the intervention threshold",
          "Crash history with severity breakdown (fatal, injury, tow-away)",
          "Inspection history with OOS rate compared against the national average",
          "Hazmat permit and registration if the carrier hauls placarded loads",
          "Drug and alcohol consortium enrollment confirmation",
          "ELD compliance attestation",
        ].map((item, i) => (
          <ChecklistItem key={`s3-${i}`} text={item} />
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
          Section 4 — Background & Network
        </h2>

        {[
          "OFAC sanctions screening on the carrier and on every listed officer",
          "SAM.gov exclusion list check",
          "Federal court records search for fraud, theft, or freight-related litigation",
          "Officer cross-reference against historical FMCSA records — flag any prior associations with closed or revoked carriers",
          "Address cross-reference against other active carriers — flag any shared physical or mailing addresses",
          "Phone verification — confirm at least one non-VoIP number for dispatch",
        ].map((item, i) => (
          <ChecklistItem key={`s4-${i}`} text={item} />
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
          Section 5 — Operational
        </h2>

        {[
          "List of equipment with VINs and model years",
          "Confirmation that VINs are not currently registered to a different active carrier",
          "Driver roster (or attestation that drivers meet FMCSR Part 391 qualification standards)",
          "Lanes the carrier actually runs — not lanes they would like to run",
          "Quick-pay / factoring relationships disclosed",
          "Process for after-hours emergency contact",
        ].map((item, i) => (
          <ChecklistItem key={`s5-${i}`} text={item} />
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
          Section 6 — File Management
        </h2>

        {[
          "Date-stamped copies of every document above",
          "Snapshot of the FMCSA SAFER profile at the moment of onboarding",
          "Re-verification cadence set (we recommend 30 days for new carriers, 90 days for established ones)",
          "Single shared folder accessible to dispatch, claims, and legal — not buried in someone's inbox",
          "Audit log of who reviewed the packet and when",
        ].map((item, i) => (
          <ChecklistItem key={`s6-${i}`} text={item} />
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
          What Changed for 2026
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Three things have shifted in the last year and are worth calling out
          explicitly:
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
            <strong>Insurance verification has gotten harder to fake.</strong>{" "}
            Brokers should now pull insurance status directly from FMCSA Li, not
            just accept the COI emailed by the carrier. Forged COIs are a known
            entry vector for double brokering.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Identity-based fraud is the dominant pattern.</strong>{" "}
            Address-sharing, officer-overlap, and chameleon authority schemes
            now account for the majority of cargo-theft losses reported by
            CargoNet. Section 4 of this checklist exists for that reason.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Documentation discipline matters in court.</strong>{" "}
            Plaintiff attorneys in cargo-related lawsuits now routinely
            subpoena the broker's onboarding file. A packet that proves you
            checked everything in Sections 1 through 5 is a stronger defense
            than the same checks done sloppily and not recorded.
          </li>
        </ul>

        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          You can run most of the items in Sections 1, 3, and 4 of this
          checklist directly on FleetSight, free, with no signup. The carrier
          search at the top of the homepage pulls live FMCSA data and surfaces
          identity, safety, and chameleon signals in seconds.
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
            Run sections 1, 3, and 4 instantly
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

function ChecklistItem({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 8,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: 4,
          border: "1.5px solid var(--accent)",
          color: "var(--accent)",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        ✓
      </span>
      <span style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)" }}>
        {text}
      </span>
    </div>
  );
}
