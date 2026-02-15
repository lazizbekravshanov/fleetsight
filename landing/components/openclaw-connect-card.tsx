"use client";

import { useState } from "react";

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

  async function connect() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/openclaw/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "carrier:read", ttlDays: 30 })
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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <h3 className="text-lg font-semibold text-white">Connect OpenClaw</h3>
      <p className="mt-2 text-sm text-slate-300">
        Generate a customer-scoped token to allow OpenClaw to call FleetSight carrier endpoints.
      </p>
      <button
        onClick={connect}
        disabled={loading}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Generating token..." : "Connect OpenClaw"}
      </button>

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {tokenData ? (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p><span className="font-semibold">Token:</span> {tokenData.token}</p>
          <p><span className="font-semibold">Scope:</span> {tokenData.scope}</p>
          <p><span className="font-semibold">Expires:</span> {new Date(tokenData.expiresAt).toLocaleString()}</p>
          <p><span className="font-semibold">Setup:</span> set `FLEETSIGHT_BASE_URL` and `FLEETSIGHT_TOKEN` in OpenClaw gateway.</p>
        </div>
      ) : null}
    </div>
  );
}
