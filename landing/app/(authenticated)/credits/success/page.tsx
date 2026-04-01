"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCredits } from "@/components/credits/credits-context";

export default function CreditsSuccessPage() {
  const { credits, refreshCredits, loading } = useCredits();

  useEffect(() => {
    // Refresh balance after Stripe redirect (webhook may take a moment)
    const timer = setTimeout(() => refreshCredits(), 1500);
    return () => clearTimeout(timer);
  }, [refreshCredits]);

  return (
    <main className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface-1 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">Credits Added!</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your purchase was successful. Credits are now available.
        </p>
        <p className="mt-3 text-3xl font-bold text-ink">
          {loading ? "..." : credits ?? 0}
        </p>
        <p className="text-xs text-ink-muted">credits available</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Start Searching
          </Link>
          <Link
            href="/credits"
            className="text-sm text-ink-soft hover:text-ink-soft"
          >
            Buy more credits
          </Link>
        </div>
      </div>
    </main>
  );
}
