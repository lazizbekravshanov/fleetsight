import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | FleetSight",
  description:
    "FleetSight Terms of Service. Free FMCSA carrier intelligence search. Public-record disclaimers, acceptable use, and limitations of liability.",
};

const LAST_UPDATED = "April 7, 2026";

const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. Acceptance of Terms",
    body: (
      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to
        and use of FleetSight (&ldquo;FleetSight,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;), including the website at
        fleetsight.vercel.app and all related pages, search tools, and APIs
        (collectively, the &ldquo;Service&rdquo;). By accessing or using the
        Service, you agree to be bound by these Terms. If you do not agree to
        these Terms, do not use the Service.
      </p>
    ),
  },
  {
    heading: "2. What FleetSight Is",
    body: (
      <p>
        FleetSight is a free search interface over publicly available motor
        carrier data published by the Federal Motor Carrier Safety
        Administration (FMCSA), the National Highway Traffic Safety
        Administration (NHTSA), and other U.S. federal and state agencies. We
        aggregate, index, and present this public data alongside computed
        risk indicators and fraud-detection signals derived from that public
        data. We do not collect carrier data from non-public sources and we
        are not affiliated with FMCSA, NHTSA, or any government agency.
      </p>
    ),
  },
  {
    heading: "3. Eligibility",
    body: (
      <p>
        You must be at least 18 years old and legally able to enter into a
        binding agreement to use the Service. Most features are available to
        anonymous visitors with no account. Optional features such as the
        watchlist, saved searches, and team collaboration require a free
        account. By creating an account you represent that the information you
        provide is accurate and that you are authorized to use the email
        address you register with.
      </p>
    ),
  },
  {
    heading: "4. Acceptable Use",
    body: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>
            Violate any law, regulation, or third-party right;
          </li>
          <li style={{ marginBottom: 6 }}>
            Scrape, mirror, frame, or otherwise systematically copy the
            Service, except via documented APIs and within their published
            rate limits;
          </li>
          <li style={{ marginBottom: 6 }}>
            Reverse engineer, decompile, or attempt to extract source code or
            data structures from the Service;
          </li>
          <li style={{ marginBottom: 6 }}>
            Submit false, misleading, or impersonating information when
            registering for an account;
          </li>
          <li style={{ marginBottom: 6 }}>
            Use the Service to harass, defame, or unlawfully discriminate
            against any motor carrier, driver, or other person;
          </li>
          <li style={{ marginBottom: 6 }}>
            Interfere with the operation of the Service, including through
            denial-of-service attempts, automated abuse, or attempts to
            circumvent security or rate-limit controls.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "5. Public Record Disclaimer",
    body: (
      <>
        <p>
          The motor carrier information displayed on FleetSight is sourced
          from public federal and state records. We make a best-effort attempt
          to keep this data accurate and current, but we do not guarantee that
          it is error-free, complete, or up-to-date. FMCSA and other source
          agencies update their data on independent schedules, and corrections
          to underlying source data are reflected on FleetSight only after the
          source agency publishes them.
        </p>
        <p style={{ marginTop: 12 }}>
          FleetSight is an informational tool. It is not a credit report,
          consumer report, or employment screening service, and it must not be
          used as the sole basis for any adverse decision against a motor
          carrier, driver, or other person. You are responsible for verifying
          information independently before relying on it for any business or
          legal decision.
        </p>
      </>
    ),
  },
  {
    heading: "6. Risk Indicators and Fraud Signals",
    body: (
      <p>
        FleetSight computes risk indicators (including but not limited to
        Trust Scores, chameleon-detection signals, and risk grades) using
        statistical and rule-based analysis of public data. These indicators
        are FleetSight&apos;s opinions, not statements of fact. They are
        intended to surface patterns that warrant further investigation —
        not to substitute for due diligence, legal advice, or independent
        verification. A high risk score does not mean a carrier has done
        anything wrong, and a low risk score does not guarantee a carrier is
        safe to do business with.
      </p>
    ),
  },
  {
    heading: "7. Accounts and Security",
    body: (
      <p>
        If you create an account, you are responsible for maintaining the
        confidentiality of your credentials and for all activity that occurs
        under your account. You agree to notify us immediately of any
        unauthorized use. We may suspend or terminate accounts that violate
        these Terms or that we reasonably believe are being used for abuse.
      </p>
    ),
  },
  {
    heading: "8. Intellectual Property",
    body: (
      <p>
        FleetSight retains all rights, title, and interest in the Service
        software, design, computed indicators, and original content. Public
        records sourced from government agencies remain in the public domain.
        You may not copy or redistribute the Service or its computed outputs
        in bulk without our prior written consent.
      </p>
    ),
  },
  {
    heading: "9. Disclaimer of Warranties",
    body: (
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; without warranties of any kind, express or implied,
        including without limitation any warranty of merchantability, fitness
        for a particular purpose, non-infringement, or accuracy of data. We
        do not warrant that the Service will be uninterrupted, error-free, or
        free of harmful components.
      </p>
    ),
  },
  {
    heading: "10. Limitation of Liability",
    body: (
      <p>
        To the maximum extent permitted by law, FleetSight and its operators
        shall not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits, revenues,
        data, or business opportunities, arising out of or related to your
        use of the Service. Our total cumulative liability for any claim
        arising out of or related to the Service shall not exceed one hundred
        U.S. dollars ($100).
      </p>
    ),
  },
  {
    heading: "11. Changes to These Terms",
    body: (
      <p>
        We may revise these Terms from time to time. The current version is
        always posted at this URL with the &ldquo;Last updated&rdquo; date at
        the top. Material changes will be flagged on the homepage or by email
        to registered account holders. Continued use of the Service after
        changes take effect constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    heading: "12. Governing Law",
    body: (
      <p>
        These Terms are governed by the laws of the State of Delaware, United
        States, without regard to its conflict-of-laws provisions. Any dispute
        arising out of or related to these Terms or the Service shall be
        resolved exclusively in the state or federal courts located in
        Delaware.
      </p>
    ),
  },
  {
    heading: "13. Contact",
    body: (
      <p>
        Questions about these Terms can be directed to{" "}
        <a
          href="mailto:legal@fleetsight.io"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          legal@fleetsight.io
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
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
            maxWidth: 760,
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
            href="/"
            style={{
              fontSize: 14,
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Carrier Search
          </Link>
        </div>
      </header>

      <article
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "64px 24px 80px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 8,
          }}
        >
          Terms of Service
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--ink-muted)",
            marginBottom: 40,
          }}
        >
          Last updated: {LAST_UPDATED}
        </p>

        {sections.map((section) => (
          <section
            key={section.heading}
            style={{ marginBottom: 32, fontSize: 16, lineHeight: 1.75 }}
          >
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 22,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              {section.heading}
            </h2>
            <div style={{ color: "var(--ink-soft)" }}>{section.body}</div>
          </section>
        ))}
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
        <p style={{ margin: 0 }}>
          FleetSight — free FMCSA carrier intelligence.{" "}
          <Link
            href="/privacy"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Privacy
          </Link>
        </p>
      </footer>
    </div>
  );
}
