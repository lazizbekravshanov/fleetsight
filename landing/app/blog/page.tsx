import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog | FleetSight — Carrier Verification & Freight Safety Insights",
  description:
    "Articles on chameleon carrier detection, FMCSA BASIC scores, carrier verification tools, and freight safety intelligence. Stay informed with FleetSight.",
  openGraph: {
    title: "FleetSight Blog — Carrier Verification & Freight Safety",
    description:
      "Expert guides on chameleon carrier detection, FMCSA compliance, and carrier vetting tools for brokers and safety teams.",
    type: "website",
  },
};

const posts = [
  {
    slug: "how-to-detect-chameleon-carriers",
    title: "How to Detect Chameleon Carriers: 7 Signals That Expose Reincarnated Fleets",
    description:
      "Chameleon carriers kill. Learn the 7 data signals FleetSight uses to identify carriers that re-register to shed crash history, OOS orders, and safety violations.",
    date: "2026-03-18",
    tag: "Safety",
  },
  {
    slug: "fmcsa-basic-scores-explained",
    title: "FMCSA BASIC Scores Explained: What Every Broker and Carrier Should Know",
    description:
      "Understand the 7 BASIC categories, percentile thresholds, intervention triggers, and how to check your scores using public FMCSA data.",
    date: "2026-03-25",
    tag: "Compliance",
  },
  {
    slug: "fleetsight-vs-carrier411",
    title: "FleetSight vs Carrier411: Free Carrier Verification Compared to Paid",
    description:
      "A fair comparison of FleetSight and Carrier411. See how a free, AI-powered platform stacks up against a $35+/month legacy service.",
    date: "2026-03-30",
    tag: "Comparison",
  },
  {
    slug: "fleetsight-vs-searchmule",
    title: "FleetSight vs SearchMule: Which Free Carrier Lookup Tool Is Better?",
    description:
      "Both are free. Both pull FMCSA data. But FleetSight adds chameleon detection, background checks, VIN tracking, and AI search. Here is how they compare.",
    date: "2026-04-01",
    tag: "Comparison",
  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndex() {
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
            maxWidth: 960,
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

      {/* Hero */}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "64px 24px 32px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 40,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 12,
          }}
        >
          FleetSight Blog
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
            maxWidth: 600,
          }}
        >
          Guides on carrier verification, chameleon carrier detection, FMCSA
          compliance, and freight safety intelligence.
        </p>
      </section>

      {/* Post list */}
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 24px 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <article
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "28px 32px",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseOver={undefined}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
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
                    {post.tag}
                  </span>
                  <time
                    style={{
                      fontSize: 13,
                      color: "var(--ink-muted)",
                    }}
                    dateTime={post.date}
                  >
                    {formatDate(post.date)}
                  </time>
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    marginBottom: 8,
                  }}
                >
                  {post.title}
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--ink-soft)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {post.description}
                </p>
              </article>
            </Link>
          ))}
        </div>
      </section>

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
