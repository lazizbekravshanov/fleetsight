"use client";

import { useEffect, useState } from "react";

type LoadState = {
  loading: boolean;
  error: string | null;
  profile: Record<string, unknown> | null;
  basics: unknown;
};

export function CarrierSnapshot({ usdotNumber }: { usdotNumber: string }) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    profile: null,
    basics: null
  });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [profileRes, basicsRes] = await Promise.all([
        fetch(`/api/fmcsa/carriers/${usdotNumber}`),
        fetch(`/api/fmcsa/carriers/${usdotNumber}/basics`)
      ]);

      const profileBody = await profileRes.json().catch(() => ({}));
      const basicsBody = await basicsRes.json().catch(() => ({}));

      if (!profileRes.ok || !basicsRes.ok) {
        throw new Error(profileBody.error || basicsBody.error || "FMCSA lookup failed");
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
        basics: basicsBody.basics
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Request failed",
        profile: null,
        basics: null
      });
    }
  }

  useEffect(() => {
    load();
  }, [usdotNumber]);

  if (state.loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500">Loading carrier snapshot...</div>;
  }

  if (state.error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        <p>{state.error}</p>
        <button onClick={load} className="mt-3 rounded bg-rose-600 px-3 py-1.5 text-white">
          Retry
        </button>
      </div>
    );
  }

  const legalName = String(state.profile?.legalName || state.profile?.legal_name || "Unknown");
  const dba = String(state.profile?.dbaName || state.profile?.dba_name || "N/A");
  const operatingStatus = String(state.profile?.operatingStatus || state.profile?.status || "Unknown");
  const basicsItems = (state.basics as { content?: { basics?: unknown[] }; basics?: unknown[] } | null)
    ?.content?.basics ||
    (state.basics as { basics?: unknown[] } | null)?.basics ||
    [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-gray-900">Carrier Snapshot</h3>
      <dl className="mt-3 grid gap-2 text-sm text-gray-700">
        <div>
          <dt className="text-gray-500">Legal Name</dt>
          <dd>{legalName}</dd>
        </div>
        <div>
          <dt className="text-gray-500">DBA</dt>
          <dd>{dba}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Operating Status</dt>
          <dd>{operatingStatus}</dd>
        </div>
        <div>
          <dt className="text-gray-500">BASIC Summary</dt>
          <dd>{Array.isArray(basicsItems) ? `${basicsItems.length} BASIC records` : "No BASIC data"}</dd>
        </div>
      </dl>
    </div>
  );
}
