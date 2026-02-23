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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-gray-900">Connect OpenClaw</h3>
      <p className="mt-2 text-sm text-gray-500">
        Generate a customer-scoped token to allow OpenClaw to call FleetSight carrier endpoints.
      </p>
      <button
        onClick={connect}
        disabled={loading}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Generating token..." : "Connect OpenClaw"}
      </button>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {tokenData ? (
        <div className="mt-4 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <p><span className="font-semibold">Token:</span> {tokenData.token}</p>
          <p><span className="font-semibold">Scope:</span> {tokenData.scope}</p>
          <p><span className="font-semibold">Expires:</span> {new Date(tokenData.expiresAt).toLocaleString()}</p>
          <p><span className="font-semibold">Setup:</span> set `FLEETSIGHT_BASE_URL` and `FLEETSIGHT_TOKEN` in OpenClaw gateway.</p>
        </div>
      ) : null}
    </div>
  );
}
