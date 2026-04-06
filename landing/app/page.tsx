import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CarrierLookup } from "@/components/carrier";
import { getServerAuthSession } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "FleetSight | Agentic FMCSA Carrier Intelligence",
  description:
    "Search 4.4M FMCSA-registered carriers. An AI agent vets each carrier with full chameleon detection, trust scoring, and citation-backed verdicts in seconds.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerAuthSession();
  const userId = session?.user?.id;

  // Pull recent agent activity for the signed-in user (lazy-fetched, small)
  let recentSessions: Array<{ id: string; carrierDotNumber: string | null; persona: string; updatedAt: Date }> = [];
  let unreadAlerts: number = 0;
  let watchedCount: number = 0;
  if (userId) {
    [recentSessions, unreadAlerts, watchedCount] = await Promise.all([
      prisma.agentSession.findMany({
        where: { userId, carrierDotNumber: { not: null } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, carrierDotNumber: true, persona: true, updatedAt: true },
      }),
      prisma.monitoringAlert.count({ where: { userId, readAt: null } }),
      prisma.watchedCarrier.count({ where: { userId } }),
    ]);
  }

  return (
    <Suspense>
      <CarrierLookup />
      {userId && (recentSessions.length > 0 || unreadAlerts > 0 || watchedCount > 0) && (
        <SignedInPanel
          recentSessions={recentSessions}
          unreadAlerts={unreadAlerts}
          watchedCount={watchedCount}
        />
      )}
    </Suspense>
  );
}

function SignedInPanel({
  recentSessions,
  unreadAlerts,
  watchedCount,
}: {
  recentSessions: Array<{ id: string; carrierDotNumber: string | null; persona: string; updatedAt: Date }>;
  unreadAlerts: number;
  watchedCount: number;
}) {
  return (
    <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Recent investigations" value={recentSessions.length} href="/dashboard" />
        <Stat label="Watched carriers" value={watchedCount} href="/dashboard" />
        <Stat
          label="Unread alerts"
          value={unreadAlerts}
          href="/dashboard"
          highlight={unreadAlerts > 0}
        />
      </div>

      {recentSessions.length > 0 && (
        <div
          className="mt-6 rounded-xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
        >
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Recent investigations
          </h2>
          <ul className="space-y-1.5">
            {recentSessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.carrierDotNumber ? `/console/${s.carrierDotNumber}` : "/dashboard"}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--ink)" }}
                >
                  <span>
                    DOT {s.carrierDotNumber}{" "}
                    <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      · {s.persona}
                    </span>
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {timeAgo(s.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-4 text-center transition-colors hover:bg-[var(--surface-2)]"
      style={{
        borderColor: highlight ? "var(--accent)" : "var(--border)",
        background: "var(--surface-1)",
      }}
    >
      <p
        className="text-2xl font-bold"
        style={{ color: highlight ? "var(--accent)" : "var(--ink)" }}
      >
        {value}
      </p>
      <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
    </Link>
  );
}

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
