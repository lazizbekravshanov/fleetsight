import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Releases | FleetSight Changelog",
  description:
    "Recent releases and changes to FleetSight: new features, fixes, and improvements to FMCSA carrier intelligence, chameleon detection, and trust scoring.",
  openGraph: {
    title: "FleetSight Releases",
    description:
      "What is new in FleetSight — features, fixes, and improvements.",
    type: "website",
  },
};

type Tag = "NEW" | "FIX" | "IMPROVED";

type Release = {
  version: string;
  date: string;
  entries: { tag: Tag; text: string }[];
};

const releases: Release[] = [
  {
    version: "v1.6.0",
    date: "2026-04-07",
    entries: [
      {
        tag: "IMPROVED",
        text: "Pivoted away from the agent console UI back to a search-first product. Carrier search results now route directly to the public intelligence page — no two-pane consoles, no agent personas, no dashboards.",
      },
      {
        tag: "FIX",
        text: "Removed every reference to the deleted /dashboard route from navigation, sitemap, manifest, service worker, and email templates.",
      },
      {
        tag: "FIX",
        text: "Removed unused agent Prisma models so the schema reflects the actual product (search + carrier intelligence).",
      },
    ],
  },
  {
    version: "v1.5.0",
    date: "2026-04-04",
    entries: [
      {
        tag: "NEW",
        text: "Trust Score engine: 0–100 composite score combining 25 automated risk signals across safety, compliance, fraud, and stability.",
      },
      {
        tag: "NEW",
        text: "D3 SVG crash map on the carrier crashes view — replaces the prior Leaflet implementation with a faster, lighter geoAlbersUsa projection.",
      },
      {
        tag: "IMPROVED",
        text: "Lucide React icons across the platform replace the legacy hand-rolled SVGs.",
      },
      {
        tag: "IMPROVED",
        text: "Search optimization: edge caching, parallel AI + standard search, debounced typeahead. Most searches now return in under 200 ms.",
      },
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-04-03",
    entries: [
      {
        tag: "NEW",
        text: "Public carrier profiles at /carrier/[dot] — shareable, SEO-indexable, no auth required.",
      },
      {
        tag: "NEW",
        text: "Inspection heatmap with state borders + dot overlay on the carrier inspections view.",
      },
      {
        tag: "NEW",
        text: "Carrier timeline tab with chronological event history.",
      },
      {
        tag: "NEW",
        text: "Shareable carrier reports at /report/[dot] for sending out a clean snapshot.",
      },
      {
        tag: "IMPROVED",
        text: "Search speed: dropped live FMCSA enrichment from the result list and added result + AI translation caching.",
      },
      {
        tag: "IMPROVED",
        text: "Removed the signup wall — every feature is now free with no account required.",
      },
      {
        tag: "FIX",
        text: "Hardened .gitignore to block every .env variant and other secret file patterns.",
      },
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-03-31",
    entries: [
      {
        tag: "IMPROVED",
        text: "Full Anthropic-style design refresh: serif headings, terracotta accent color, warm minimal light theme, replaced every hardcoded color with design tokens.",
      },
      {
        tag: "NEW",
        text: "Dark-first sidebar shell with design tokens and theme-aware pages.",
      },
    ],
  },
  {
    version: "v1.2.0",
    date: "2026-03-25",
    entries: [
      {
        tag: "NEW",
        text: "Affiliations and shared-VIN graph: identifies carriers that share vehicles, addresses, or principals with other carriers.",
      },
      {
        tag: "NEW",
        text: "Chameleon carrier detection — 7-signal scoring algorithm to flag carriers that re-register to shed safety records.",
      },
      {
        tag: "NEW",
        text: "Background and compliance checks: OFAC sanctions, SAM.gov exclusions, federal court records, OSHA violations.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "2026-03-15",
    entries: [
      {
        tag: "NEW",
        text: "AI-powered natural language search: type 'large hazmat carriers in Texas' and FleetSight translates it into a precise FMCSA query.",
      },
      {
        tag: "NEW",
        text: "Bulk screening: paste up to 50 DOT numbers and get a side-by-side risk view.",
      },
      {
        tag: "NEW",
        text: "Carrier compare view for direct head-to-head analysis.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "2026-03-01",
    entries: [
      {
        tag: "NEW",
        text: "FleetSight launches: free FMCSA carrier search across 4.4 million registered carriers with safety, inspection, crash, and authority data.",
      },
    ],
  },
];

const tagStyles: Record<Tag, { bg: string; fg: string }> = {
  NEW: { bg: "rgba(22, 163, 74, 0.12)", fg: "#15803d" },
  FIX: { bg: "rgba(217, 119, 87, 0.14)", fg: "#9a3412" },
  IMPROVED: { bg: "rgba(59, 130, 246, 0.12)", fg: "#1d4ed8" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ReleasesPage() {
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

      <section
        style={{
          maxWidth: 760,
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
          Releases
        </h1>
        <p
          style={{
            fontSize: 17,
            color: "var(--ink-soft)",
            lineHeight: 1.6,
            maxWidth: 600,
          }}
        >
          What is new, fixed, and improved in FleetSight. Newest first.
        </p>
      </section>

      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "0 24px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {releases.map((rel) => (
          <article
            key={rel.version}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "24px 28px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  padding: "4px 10px",
                  borderRadius: 6,
                }}
              >
                {rel.version}
              </span>
              <time
                style={{ fontSize: 13, color: "var(--ink-muted)" }}
                dateTime={rel.date}
              >
                {formatDate(rel.date)}
              </time>
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {rel.entries.map((entry, i) => {
                const ts = tagStyles[entry.tag];
                return (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        color: ts.fg,
                        background: ts.bg,
                        padding: "3px 8px",
                        borderRadius: 4,
                        marginTop: 2,
                        minWidth: 64,
                        textAlign: "center",
                      }}
                    >
                      {entry.tag}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        lineHeight: 1.65,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {entry.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </section>

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
