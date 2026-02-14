"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const painPoints = [
  "Manual FMCSA lookups",
  "Double brokering risk",
  "Chameleon carriers",
  "Hidden affiliations",
  "Safety blind spots",
  "Slow verification workflows"
];

const features = [
  {
    title: "Real-Time USDOT Verification",
    body: "Instant federal data analysis."
  },
  {
    title: "FMCSA Authority Intelligence",
    body: "Detect revocations, reinstatements, and status changes."
  },
  {
    title: "AI Risk Scoring Engine",
    body: "Operational risk scored in seconds."
  },
  {
    title: "Chameleon Carrier Detection",
    body: "Identify suspicious reincarnated carriers."
  },
  {
    title: "Affiliation Mapping",
    body: "Expose hidden corporate relationships."
  },
  {
    title: "Safety Pattern Recognition",
    body: "Crash and inspection trend analysis."
  }
];

const personas = [
  ["Freight Brokers", "Reduce fraud and unsafe carrier exposure."],
  ["Motor Carriers", "Prove credibility instantly."],
  ["Insurance Underwriters", "Improve risk evaluation accuracy."],
  ["Factoring Companies", "Prevent fraudulent carrier onboarding."]
];

const trustItems = [
  "Built on Federal Data",
  "AI-Driven Decision Engine",
  "Enterprise-Ready Architecture",
  "Secure Infrastructure",
  "SOC2-ready design"
];

function Section({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-ink dark:text-slate-100 sm:text-3xl">
          {title}
        </h2>
        <div className="mt-6">{children}</div>
      </motion.div>
    </section>
  );
}

export default function Page() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const fromStorage = window.localStorage.getItem("fleetsight-theme");
    if (fromStorage === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      window.localStorage.setItem("fleetsight-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      window.localStorage.setItem("fleetsight-theme", "light");
    }
  }, [dark]);

  return (
    <main className="relative overflow-hidden bg-white text-ink transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(69,141,255,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(128,187,255,0.16),transparent_30%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(75,163,255,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(75,163,255,0.2),transparent_30%)]" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <a href="#" className="font-mono text-sm text-ink-soft dark:text-slate-300">
          FleetSight
        </a>
        <button
          type="button"
          onClick={() => setDark((v) => !v)}
          className="rounded-full border border-line-blue bg-white/70 px-4 py-2 text-sm text-ink backdrop-blur transition hover:shadow-glow dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          aria-label="Toggle dark mode"
        >
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-10 pt-6 sm:px-6 md:grid-cols-2 md:items-center md:pb-16 md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
            AI Verification Platform for U.S. Transportation
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-ink dark:text-white sm:text-5xl">
            Verify Any Carrier. Instantly.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft dark:text-slate-300">
            AI-powered verification and risk intelligence for USDOT and FMCSA data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500">
              Verify a USDOT
            </button>
            <button className="rounded-xl border border-blue-200 bg-white/80 px-5 py-3 text-sm font-medium text-blue-700 backdrop-blur transition hover:shadow-glow dark:border-slate-600 dark:bg-slate-900/50 dark:text-blue-200">
              Request Early Access
            </button>
          </div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="rounded-2xl border border-line-blue bg-white/70 p-5 shadow-panel backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/60"
          aria-label="Dashboard preview"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft dark:text-slate-300">
              Carrier Profile
            </p>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              Active
            </span>
          </div>
          <p className="mt-4 text-xl font-semibold">Blue Horizon Transit LLC</p>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-lg border border-line-blue bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <dt className="text-ink-soft dark:text-slate-300">USDOT</dt>
              <dd className="mt-1 font-mono font-medium">3875124</dd>
            </div>
            <div className="rounded-lg border border-line-blue bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <dt className="text-ink-soft dark:text-slate-300">MC</dt>
              <dd className="mt-1 font-mono font-medium">1294478</dd>
            </div>
            <div className="rounded-lg border border-line-blue bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <dt className="text-ink-soft dark:text-slate-300">Risk Score</dt>
              <dd className="mt-1 text-base font-semibold text-amber-600 dark:text-amber-300">
                82 / 100
              </dd>
            </div>
            <div className="rounded-lg border border-line-blue bg-white/75 p-3 dark:border-slate-700 dark:bg-slate-900/70">
              <dt className="text-ink-soft dark:text-slate-300">Authority</dt>
              <dd className="mt-1 font-medium text-rose-600 dark:text-rose-300">
                Recently Reinstated
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-sm text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100">
            AI explanation: Affiliation overlap found with two high-risk entities. Crash trend elevated in the last 12 months.
          </div>
        </motion.aside>
      </section>

      <Section id="problem" title="Freight runs on trust. Trust runs on data.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {painPoints.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-line-blue bg-white/70 p-4 text-sm text-ink-soft shadow-glow dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="solution" title="AI That Reads the Entire Safety History.">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ul className="space-y-3 text-ink-soft dark:text-slate-300">
            <li>Aggregates FMCSA data in real-time</li>
            <li>Detects anomalies and authority changes</li>
            <li>Flags affiliated carriers</li>
            <li>Scores operational risk</li>
            <li>Identifies crash and inspection patterns</li>
            <li>Surfaces hidden safety signals</li>
          </ul>
          <div className="rounded-2xl border border-line-blue bg-white/70 p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900/60">
            <p className="font-mono text-xs uppercase tracking-[0.15em] text-blue-700 dark:text-blue-300">
              Example Output
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>Risk Score: 82 / 100</li>
              <li>Hidden Affiliation Detected</li>
              <li>Elevated Crash Pattern</li>
              <li>Authority Recently Reinstated</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section id="features" title="Platform Features">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-line-blue bg-white/70 p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900/60"
            >
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-ink-soft dark:text-slate-300">{feature.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="how" title="How It Works">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "Enter USDOT or MC number",
            "AI aggregates federal data",
            "Risk and affiliation engine runs",
            "Instant verification report generated"
          ].map((step, idx) => (
            <li
              key={step}
              className="rounded-xl border border-line-blue bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <p className="font-mono text-xs tracking-[0.16em] text-blue-700 dark:text-blue-300">
                0{idx + 1}
              </p>
              <p className="mt-3 text-sm text-ink-soft dark:text-slate-300">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="for" title="Who It Is For">
        <div className="grid gap-4 md:grid-cols-2">
          {personas.map(([name, desc]) => (
            <article
              key={name}
              className="rounded-xl border border-line-blue bg-white/70 p-5 dark:border-slate-700 dark:bg-slate-900/60"
            >
              <h3 className="text-base font-semibold">{name}</h3>
              <p className="mt-2 text-sm text-ink-soft dark:text-slate-300">{desc}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section id="trust" title="Trust and Infrastructure">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trustItems.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-line-blue bg-white/70 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/60"
            >
              {item}
            </li>
          ))}
        </ul>
      </Section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white shadow-panel dark:border-blue-500/30">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-blue-100">Final Call to Action</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Stop Guessing. Start Verifying.</h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <button className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
              Verify a Carrier
            </button>
            <button className="rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Join the Waitlist
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

