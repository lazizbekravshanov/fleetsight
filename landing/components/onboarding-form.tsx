"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ValidateResponse = {
  ok?: boolean;
  carrier?: Record<string, unknown>;
  error?: string;
};

export function OnboardingForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [usdotNumber, setUsdotNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [carrierName, setCarrierName] = useState<string | null>(null);

  async function validateUsdDot() {
    setValidating(true);
    setError(null);
    const res = await fetch("/api/fmcsa/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dotNumber: usdotNumber })
    });

    const body = (await res.json().catch(() => ({}))) as ValidateResponse;
    if (!res.ok || !body.ok) {
      setCarrierName(null);
      setError(body.error || "USDOT could not be validated.");
      setValidating(false);
      return false;
    }

    const legalName = String(body.carrier?.legalName || body.carrier?.legal_name || "Carrier found");
    setCarrierName(legalName);
    setValidating(false);
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const valid = await validateUsdDot();
    if (!valid) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/profile/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, usdotNumber })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || "Onboarding failed.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface-1 p-6 shadow-sm">
      <p className="text-sm text-ink-soft">Signed in as {initialEmail}</p>
      <label className="block text-sm text-ink-soft">
        Company Name
        <input
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <label className="block text-sm text-ink-soft">
        USDOT Number
        <input
          required
          value={usdotNumber}
          onChange={(e) => setUsdotNumber(e.target.value.replace(/\D/g, ""))}
          className="mt-1 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={validateUsdDot}
          disabled={validating || !usdotNumber}
          className="rounded-lg border border-accent/30 px-4 py-2 text-sm text-accent hover:bg-accent-soft disabled:opacity-60"
        >
          {validating ? "Validating..." : "Validate USDOT"}
        </button>
        <button
          type="submit"
          disabled={loading || !companyName || !usdotNumber}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? "Saving..." : "Finish onboarding"}
        </button>
      </div>
      {carrierName ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          FMCSA match found: {carrierName}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
