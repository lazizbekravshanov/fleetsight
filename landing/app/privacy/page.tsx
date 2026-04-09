import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | FleetSight",
  description:
    "FleetSight Privacy Policy. What we collect (and don't), how we use it, what we never sell, and how to delete your account.",
};

const LAST_UPDATED = "April 7, 2026";

const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "1. Overview",
    body: (
      <p>
        This Privacy Policy explains what information FleetSight
        (&ldquo;FleetSight,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) collects from visitors and registered users of our
        Service, how we use that information, and the choices you have. We try
        to keep this short and free of legal padding. If anything is unclear,
        write to us at the address at the bottom of this page.
      </p>
    ),
  },
  {
    heading: "2. The Short Version",
    body: (
      <ul style={{ paddingLeft: 24 }}>
        <li style={{ marginBottom: 6 }}>
          You can use the carrier search anonymously. We do not require an
          account.
        </li>
        <li style={{ marginBottom: 6 }}>
          If you create an account, we store your email and an encrypted
          password hash. That is the only personal information required.
        </li>
        <li style={{ marginBottom: 6 }}>
          We do not sell your data to anyone, ever.
        </li>
        <li style={{ marginBottom: 6 }}>
          We do not run third-party advertising trackers.
        </li>
        <li style={{ marginBottom: 6 }}>
          You can delete your account at any time by emailing the address at
          the bottom of this page.
        </li>
      </ul>
    ),
  },
  {
    heading: "3. Information We Collect",
    body: (
      <>
        <p>
          <strong>From anonymous visitors:</strong> we collect standard server
          logs (IP address, user-agent, requested URL, response code,
          timestamp) for the purpose of operating the Service, debugging
          errors, and applying rate limits. Server logs are retained for up to
          30 days and then deleted.
        </p>
        <p style={{ marginTop: 12 }}>
          <strong>From registered account holders:</strong> we collect the
          email address and password you provide at signup (passwords are
          stored only as a salted bcrypt hash; we never see or store the
          plaintext). We also store the watchlist entries, saved searches, and
          notes you create within the Service.
        </p>
        <p style={{ marginTop: 12 }}>
          <strong>Carrier data:</strong> the motor carrier information
          displayed on FleetSight comes from public federal and state agency
          records. It is not collected from you.
        </p>
      </>
    ),
  },
  {
    heading: "4. Cookies",
    body: (
      <p>
        We use a small number of strictly necessary cookies for session
        management (so you stay logged in) and to remember your sidebar and
        theme preferences. We do not use third-party advertising or analytics
        cookies. We do not run Google Analytics, Facebook Pixel, or any other
        cross-site tracker on the Service.
      </p>
    ),
  },
  {
    heading: "5. How We Use Information",
    body: (
      <>
        <p>We use the information we collect only to:</p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>
            Operate, secure, and improve the Service;
          </li>
          <li style={{ marginBottom: 6 }}>
            Authenticate registered users and keep their watchlists, notes,
            and saved searches associated with the correct account;
          </li>
          <li style={{ marginBottom: 6 }}>
            Send transactional emails such as account confirmations,
            watchlist alerts, and password resets;
          </li>
          <li style={{ marginBottom: 6 }}>
            Apply rate limits and detect abuse of the Service;
          </li>
          <li style={{ marginBottom: 6 }}>
            Comply with legal obligations.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "6. Service Providers",
    body: (
      <>
        <p>
          To run FleetSight, we use a small number of trusted third-party
          service providers. These providers process information only on our
          behalf and only for the purposes described above:
        </p>
        <ul style={{ paddingLeft: 24, marginTop: 8 }}>
          <li style={{ marginBottom: 6 }}>
            Hosting and edge delivery (Vercel)
          </li>
          <li style={{ marginBottom: 6 }}>
            Transactional email delivery (Resend)
          </li>
          <li style={{ marginBottom: 6 }}>
            Error and performance monitoring (Sentry)
          </li>
          <li style={{ marginBottom: 6 }}>
            Public source data via FMCSA, NHTSA, and Socrata APIs
          </li>
        </ul>
        <p style={{ marginTop: 12 }}>
          We do not share personal information with any party other than the
          providers listed above, except where required by law.
        </p>
      </>
    ),
  },
  {
    heading: "7. What We Never Do",
    body: (
      <ul style={{ paddingLeft: 24 }}>
        <li style={{ marginBottom: 6 }}>
          We do not sell, rent, or trade your personal information.
        </li>
        <li style={{ marginBottom: 6 }}>
          We do not allow third-party advertisers to track you on FleetSight.
        </li>
        <li style={{ marginBottom: 6 }}>
          We do not build advertising profiles based on your search history.
        </li>
        <li style={{ marginBottom: 6 }}>
          We do not share your watchlist, notes, or saved searches with other
          users.
        </li>
      </ul>
    ),
  },
  {
    heading: "8. Data Retention",
    body: (
      <p>
        Account information (email, password hash, watchlist, notes, saved
        searches) is retained for as long as your account is active. If you
        delete your account, this information is permanently removed within 30
        days. Server logs are retained for up to 30 days and then deleted.
      </p>
    ),
  },
  {
    heading: "9. Your Rights",
    body: (
      <p>
        Depending on where you live, you may have the right to access, correct,
        export, or delete the personal information we hold about you, and to
        object to or restrict certain processing. You can exercise these
        rights by emailing the address at the bottom of this page. We respond
        to requests within 30 days.
      </p>
    ),
  },
  {
    heading: "10. Children",
    body: (
      <p>
        FleetSight is not directed to children under 13, and we do not
        knowingly collect personal information from children. If you believe a
        child has provided personal information through the Service, please
        contact us so we can delete it.
      </p>
    ),
  },
  {
    heading: "11. International Users",
    body: (
      <p>
        FleetSight is operated from the United States. If you access the
        Service from outside the United States, you understand that your
        information will be processed in the United States, where data
        protection laws may differ from those in your country.
      </p>
    ),
  },
  {
    heading: "12. Changes to This Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. The current
        version is always posted at this URL with the &ldquo;Last
        updated&rdquo; date at the top. Material changes will be flagged on
        the homepage or by email to registered account holders.
      </p>
    ),
  },
  {
    heading: "13. Contact",
    body: (
      <p>
        Questions about this Privacy Policy, or requests to access, correct,
        export, or delete your data, can be directed to{" "}
        <a
          href="mailto:privacy@fleetsight.io"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          privacy@fleetsight.io
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
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
          Privacy Policy
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
            href="/terms"
            style={{ color: "var(--accent)", textDecoration: "none" }}
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
