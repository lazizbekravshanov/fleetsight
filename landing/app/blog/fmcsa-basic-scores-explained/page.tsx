import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title:
    "FMCSA BASIC Scores Explained: What Every Broker and Carrier Should Know",
  description:
    "Understand the 7 FMCSA BASIC categories, percentile thresholds (75th and 65th), intervention triggers, and how to check your scores using public data.",
  openGraph: {
    title: "FMCSA BASIC Scores Explained — Complete Guide",
    description:
      "Learn what BASIC scores mean, the 7 categories, threshold percentiles, and what triggers FMCSA intervention. Free guide for brokers and carriers.",
    type: "article",
  },
};

export default function FmcsaBasicScoresExplained() {
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
            Compliance
          </span>
          <time
            style={{
              fontSize: 13,
              color: "var(--ink-muted)",
              marginLeft: 12,
            }}
            dateTime="2026-03-25"
          >
            March 25, 2026
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
          FMCSA BASIC Scores Explained: What Every Broker and Carrier Should
          Know
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.75,
            color: "var(--ink-soft)",
            marginBottom: 32,
          }}
        >
          The FMCSA&apos;s Compliance, Safety, Accountability (CSA) program
          uses Behavior Analysis and Safety Improvement Categories — known as
          BASICs — to evaluate the safety performance of motor carriers. These
          scores determine which carriers the FMCSA investigates, intervenes
          with, or places out of service. Whether you are a carrier managing
          your own compliance or a broker vetting partners, understanding BASIC
          scores is essential.
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
          What Are BASIC Scores?
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          BASIC scores are percentile rankings that compare a carrier&apos;s
          safety performance against other carriers of similar size. A score of
          80 means the carrier performed worse than 80% of its peer group.
          Higher scores indicate worse performance. The scores are calculated
          from data collected during roadside inspections, crash investigations,
          and compliance reviews over the most recent 24 months.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          More recent violations are weighted more heavily than older ones, and
          the severity of each violation is factored into the calculation. This
          means a carrier that is actively improving will see its scores decline
          over time, while one that is deteriorating will see them climb.
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
          The 7 BASIC Categories
        </h2>

        {/* Category cards */}
        {[
          {
            name: "Unsafe Driving",
            threshold: "75th percentile",
            desc: "Covers violations related to dangerous driving behaviors observed during roadside inspections — speeding, reckless driving, improper lane changes, texting while driving, and failure to use a seatbelt. This is often the most visible category because these violations are recorded during routine traffic enforcement.",
          },
          {
            name: "Crash Indicator",
            threshold: "75th percentile",
            desc: "Based on the frequency and severity of crashes involving the carrier's vehicles. This includes all state-reportable crashes, regardless of fault. The FMCSA does not assign fault in this category; any crash a carrier is involved in counts against them.",
          },
          {
            name: "Hours-of-Service (HOS) Compliance",
            threshold: "75th percentile",
            desc: "Tracks violations related to driver hours-of-service regulations. This includes logbook falsification, driving beyond allowed hours, and failure to maintain required rest periods. With electronic logging devices (ELDs) now mandatory for most carriers, data quality in this category has improved significantly.",
          },
          {
            name: "Vehicle Maintenance",
            threshold: "75th percentile",
            desc: "Evaluates violations found during vehicle inspections — brake defects, tire issues, lighting problems, cargo securement failures, and other mechanical deficiencies. A high score here indicates a carrier is not properly maintaining its fleet.",
          },
          {
            name: "Controlled Substances / Alcohol",
            threshold: "75th percentile",
            desc: "Covers violations related to the possession or use of controlled substances or alcohol. This includes positive drug test results, refusal to test, and violations discovered during inspections. Due to the severity of these violations, even a small number can significantly impact the score.",
          },
          {
            name: "Hazardous Materials (HM) Compliance",
            threshold: "65th percentile",
            desc: "Applies to carriers transporting hazardous materials. Violations include improper placarding, documentation errors, and packaging failures. The intervention threshold is lower (65th percentile instead of 75th) because the consequences of hazmat incidents are potentially catastrophic.",
          },
          {
            name: "Driver Fitness",
            threshold: "75th percentile",
            desc: "Covers driver qualification requirements — valid CDL, medical certificates, proper endorsements, and licensing. Violations in this category indicate that a carrier is allowing unqualified individuals to operate commercial vehicles.",
          },
        ].map((cat, i) => (
          <div
            key={i}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
                {cat.name}
              </h3>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--accent)",
                  background: "var(--accent-soft)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                Threshold: {cat.threshold}
              </span>
            </div>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: "var(--ink-soft)",
                margin: 0,
              }}
            >
              {cat.desc}
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
          Percentile Thresholds and Interventions
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Most BASIC categories use the <strong>75th percentile</strong> as the
          intervention threshold. Carriers that exceed this threshold may
          receive warning letters, targeted inspections, cooperative safety
          plans, or comprehensive compliance investigations.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Two categories have a lower threshold of the{" "}
          <strong>65th percentile</strong>: Hazardous Materials Compliance
          and Passenger Carrier (a sub-category applied to bus and passenger
          vehicle operators). The lower threshold reflects the higher stakes
          involved with hazmat transport and passenger safety.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Exceeding a threshold does not automatically result in enforcement
          action. The FMCSA uses a tiered intervention model:
        </p>
        <ol
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            paddingLeft: 24,
            marginBottom: 16,
          }}
        >
          <li style={{ marginBottom: 8 }}>
            <strong>Warning letter</strong> — a formal notification that the
            carrier&apos;s scores exceed the threshold.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Investigation</strong> — an on-site or off-site review of
            the carrier&apos;s operations and records.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Cooperative safety plan</strong> — a voluntary agreement to
            address identified deficiencies.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Notice of violation or penalty</strong> — formal enforcement
            action that may include fines.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Out-of-service order</strong> — the carrier is prohibited
            from operating until issues are resolved.
          </li>
        </ol>

        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 24,
            fontWeight: 600,
            marginBottom: 16,
            marginTop: 40,
          }}
        >
          How to Check BASIC Scores
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          Carriers can view their own BASIC scores through the FMCSA&apos;s SMS
          (Safety Measurement System) website. Publicly, the FMCSA provides
          limited access to BASIC data — certain categories are publicly visible
          while others are restricted.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          For brokers and safety teams who need to assess carrier risk
          quickly, FleetSight surfaces relevant safety data from FMCSA public
          datasets alongside its own analysis. This includes inspection
          histories, crash records, and violation trends — the underlying data
          that feeds BASIC calculations.
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
          What This Means for Brokers
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 16 }}>
          While brokers cannot directly access all BASIC percentiles, the
          underlying inspection and crash data is public. A carrier with
          frequent out-of-service violations, multiple crashes, or a pattern of
          HOS violations is likely scoring high in those categories.
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 32 }}>
          FleetSight helps you interpret this data without being a compliance
          expert. Look up any carrier by DOT number and see inspection trends,
          crash records, safety signals, and chameleon risk indicators — all in
          one place, for free.
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
            Check any carrier&apos;s safety data — free
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
