"use client";

import { useEffect, useState } from "react";

type LoadState = {
  loading: boolean;
  error: string | null;
  profile: Record<string, unknown> | null;
  basics: unknown;
};

type BasicItem = {
  basicsTypeDesc: string;
  percentile: number;
  exceedThreshold: string;
};

function parseBasicItems(basics: unknown): BasicItem[] {
  const raw =
    (basics as { content?: { basics?: unknown[] } } | null)?.content?.basics ||
    (basics as { basics?: unknown[] } | null)?.basics ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw.map((b: unknown) => {
    const item = b as Record<string, unknown>;
    return {
    basicsTypeDesc: String(
      item.basicsTypeDesc || item.basics_type_desc || "Unknown"
    ),
    percentile: Number(item.percentile || 0),
    exceedThreshold: String(item.exceedThreshold || item.exceed_threshold || "N"),
  };
  });
}

function barColor(pct: number): string {
  if (pct >= 75) return "bg-rose-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

export function CarrierSnapshot({ usdotNumber }: { usdotNumber: string }) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    profile: null,
    basics: null,
  });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [profileRes, basicsRes] = await Promise.all([
        fetch(`/api/fmcsa/carriers/${usdotNumber}`),
        fetch(`/api/fmcsa/carriers/${usdotNumber}/basics`),
      ]);

      const profileBody = await profileRes.json().catch(() => ({}));
      const basicsBody = await basicsRes.json().catch(() => ({}));

      if (!profileRes.ok || !basicsRes.ok) {
        throw new Error(
          profileBody.error || basicsBody.error || "FMCSA lookup failed"
        );
      }

      const carrier =
        profileBody.profile?.content?.carrier?.[0] ||
        profileBody.profile?.content?.carrier ||
        profileBody.profile?.carrier ||
        null;

      setState({
        loading: false,
        error: null,
        profile: carrier,
        basics: basicsBody.basics,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Request failed",
        profile: null,
        basics: null,
      });
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdotNumber]);

  /* ── Skeleton ────────────────────────────────────── */
  if (state.loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
        <div className="space-y-3">
          <div className="h-5 w-36 rounded shimmer" />
          <div className="h-4 w-52 rounded shimmer" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 rounded shimmer" />
                <div className="h-2 w-full rounded-full shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────── */
  if (state.error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <p className="text-sm text-rose-600">{state.error}</p>
        <button
          onClick={load}
          className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Data ─────────────────────────────────────────── */
  const legalName = String(
    state.profile?.legalName || state.profile?.legal_name || "Unknown"
  );
  const dbaRaw = state.profile?.dbaName || state.profile?.dba_name;
  const dba = dbaRaw ? String(dbaRaw) : null;
  const operatingStatus = String(
    state.profile?.operatingStatus || state.profile?.status || "Unknown"
  );
  const isActive =
    operatingStatus.toUpperCase().includes("ACTIVE") ||
    operatingStatus.toUpperCase() === "A";

  const basics = parseBasicItems(state.basics);
  const alertCount = basics.filter((b) => b.percentile >= 75).length;

  return (
    <div className="rounded-xl border border-border bg-surface-1 shadow-sm">
      <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-ink">
              {legalName}
            </h3>
            {dba && (
              <p className="truncate text-sm text-ink-soft">
                DBA {dba}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
            }`}
          >
            {isActive ? "Active" : operatingStatus}
          </span>
        </div>

        <p className="mt-1 text-xs text-ink-muted">USDOT {usdotNumber}</p>

        {/* BASIC Scores */}
        {basics.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                BASIC Scores
              </p>
              {alertCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-600/20">
                  {alertCount} alert{alertCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {basics.map((b) => (
                <div key={b.basicsTypeDesc}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-soft">{b.basicsTypeDesc}</span>
                    <span
                      className={`font-medium ${
                        b.percentile >= 75 ? "text-rose-600" : "text-ink-soft"
                      }`}
                    >
                      {b.percentile}%
                    </span>
                  </div>
                  <div className="relative mt-0.5 h-1.5 overflow-visible rounded-full bg-surface-3">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(b.percentile)}`}
                      style={{
                        width: `${Math.min(b.percentile, 100)}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 h-full w-px border-l border-dashed border-border"
                      style={{ left: "75%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-xs text-ink-muted">No BASIC data available</p>
        )}
      </div>
    </div>
  );
}
