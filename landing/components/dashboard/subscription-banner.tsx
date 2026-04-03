"use client";

export function SubscriptionBanner() {
  // All features are free — show a simple status banner
  return (
    <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              Free Plan
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              All features included
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Unlimited carrier lookups, AI analysis, chameleon detection, and continuous monitoring.
          </p>
        </div>
      </div>
    </div>
  );
}
