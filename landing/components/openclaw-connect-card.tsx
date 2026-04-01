"use client";

import { useState, useCallback } from "react";

type TokenResponse = {
  token: string;
  expiresAt: string;
  issuer: string;
  scope: string;
};

export function OpenClawConnectCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function connect() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/openclaw/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "carrier:read", ttlDays: 30 }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Unable to generate token");
      setLoading(false);
      return;
    }

    setTokenData(body as TokenResponse);
    setLoading(false);
  }

  const copyToken = useCallback(async () => {
    if (!tokenData?.token) return;
    try {
      await navigator.clipboard.writeText(tokenData.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [tokenData]);

  return (
    <div className="rounded-xl border border-border bg-surface-1 shadow-sm">
      <div className="h-0.5 bg-gradient-to-r from-amber-500 to-amber-400" />
      <div className="p-5">
        <h3 className="text-lg font-semibold text-ink">
          Connect OpenClaw
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
          Generate a customer-scoped token to allow OpenClaw to call FleetSight
          carrier endpoints.
        </p>

        {!tokenData ? (
          <button
            onClick={connect}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              "Generate Token"
            )}
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Token Generated
              </p>
              <button
                onClick={copyToken}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-surface-1 px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
              >
                {copied ? (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 4l-7 7-3-3" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="5" width="9" height="9" rx="1.5" />
                      <path d="M3 11V3a1 1 0 011-1h8" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <code className="block break-all rounded border border-emerald-200 bg-surface-1 px-3 py-2 text-xs text-emerald-800">
              {tokenData.token}
            </code>
            <dl className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
              <div>
                <dt className="text-emerald-500">Scope</dt>
                <dd className="font-medium">{tokenData.scope}</dd>
              </div>
              <div>
                <dt className="text-emerald-500">Expires</dt>
                <dd className="font-medium">
                  {new Date(tokenData.expiresAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-emerald-600">
              Set <code className="font-mono">FLEETSIGHT_BASE_URL</code> and{" "}
              <code className="font-mono">FLEETSIGHT_TOKEN</code> in OpenClaw
              gateway.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-rose-600">{error}</p>
        )}
      </div>
    </div>
  );
}
