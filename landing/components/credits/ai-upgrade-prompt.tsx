"use client";

import Link from "next/link";

export function AiUpgradePrompt({ reason }: { reason: "not_authenticated" | "no_credits" }) {
  return (
    <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1l1.5 4.5H14l-3.5 2.5 1.3 4.5L8 10l-3.8 2.5 1.3-4.5L2 5.5h4.5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">
            {reason === "not_authenticated"
              ? "Sign in to unlock AI-powered insights"
              : "Add credits to unlock AI analysis"}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {reason === "not_authenticated"
              ? "Get 10 free AI credits when you create an account."
              : "Each AI analysis costs 1 credit. Packs start at $5 for 50 credits."}
          </p>
          <Link
            href={reason === "not_authenticated" ? "/login" : "/credits"}
            className="mt-2 inline-block rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          >
            {reason === "not_authenticated" ? "Sign in" : "Get credits"}
          </Link>
        </div>
      </div>
    </div>
  );
}
