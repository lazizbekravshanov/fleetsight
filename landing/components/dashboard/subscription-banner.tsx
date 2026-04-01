"use client";

import { useState, useEffect } from "react";

type SubscriptionStatus = {
  active: boolean;
  tier: string | null;
  carrierCount: number;
  carrierLimit: number | string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const TIER_NAMES: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
};

export function SubscriptionBanner() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/subscriptions/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const r = await fetch("/api/subscriptions/portal", { method: "POST" });
      if (r.ok) {
        const { url } = await r.json();
        window.location.href = url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  async function startCheckout(tier: string) {
    const r = await fetch("/api/subscriptions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (r.ok) {
      const { url } = await r.json();
      window.location.href = url;
    }
  }

  if (loading) return null;

  // Active subscription banner
  if (status?.active && status.tier) {
    const limit = status.carrierLimit === "unlimited" ? "unlimited" : status.carrierLimit;
    const usagePercent =
      typeof limit === "number"
        ? Math.round((status.carrierCount / limit) * 100)
        : 0;

    return (
      <div className="rounded-xl border border-accent/30 bg-accent-soft/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                {TIER_NAMES[status.tier] ?? status.tier} Plan
              </span>
              {status.cancelAtPeriodEnd && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Cancels at period end
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {status.carrierCount}/{limit === "unlimited" ? "unlimited" : limit} carriers monitored
            </p>
            {typeof limit === "number" && (
              <div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-accent-soft">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-accent-soft0"
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
            )}
          </div>
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="rounded-lg border border-accent/30 bg-surface-1 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft disabled:opacity-40"
          >
            {portalLoading ? "Loading..." : "Manage Subscription"}
          </button>
        </div>
      </div>
    );
  }

  // No subscription — show upgrade CTA
  return (
    <div className="rounded-xl border border-border bg-gradient-to-r from-indigo-50 to-violet-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Upgrade to Continuous Monitoring</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Get automated fleet health checks every 6 hours with instant alerts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startCheckout("starter")}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            Start at $49/mo
          </button>
        </div>
      </div>
    </div>
  );
}
