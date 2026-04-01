"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCredits } from "./credits-context";

export function CreditBadge() {
  const { status } = useSession();
  const { credits, loading } = useCredits();

  if (status !== "authenticated") return null;

  return (
    <Link
      href="/credits"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-ink-soft shadow-sm transition-colors hover:border-accent/30 hover:bg-accent-soft hover:text-accent"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v6M5.5 8h5" />
      </svg>
      {loading ? "..." : credits ?? 0} credits
    </Link>
  );
}
