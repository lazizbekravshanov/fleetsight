"use client";

import { useState } from "react";
import { useCredits } from "@/components/credits/credits-context";

const PACKS = [
  { id: "pack_50", credits: 50, price: "$5", perCredit: "$0.10", popular: false },
  { id: "pack_200", credits: 200, price: "$15", perCredit: "$0.075", popular: true },
  { id: "pack_500", credits: 500, price: "$30", perCredit: "$0.06", popular: false },
];

export default function CreditsPage() {
  const { credits, loading: creditsLoading } = useCredits();
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    setBuyingPack(packId);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setBuyingPack(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center">
        <p className="mt-1 text-sm" style={{ color: "var(--ink-soft)" }}>
          Power AI-driven search, risk narratives, and anomaly analysis
        </p>
      </div>

      {/* Current balance */}
      <div className="mx-auto mt-8 max-w-sm rounded-xl p-5 text-center shadow-sm" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
          Current Balance
        </p>
        <p className="mt-1 text-4xl font-bold" style={{ color: "var(--ink)" }}>
          {creditsLoading ? "..." : credits ?? 0}
        </p>
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>credits</p>
      </div>

      {/* Packs */}
      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`relative rounded-xl p-6 shadow-sm transition-shadow hover:shadow-md ${
              pack.popular ? "ring-2 ring-accent/30" : ""
            }`}
            style={{ background: "var(--surface-1)", border: "1px solid " + (pack.popular ? "var(--accent)" : "var(--border)") }}
          >
            {pack.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-[10px] font-semibold text-white">
                Best Value
              </span>
            )}
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: "var(--ink)" }}>{pack.credits}</p>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>credits</p>
              <p className="mt-3 text-2xl font-semibold" style={{ color: "var(--ink)" }}>{pack.price}</p>
              <p className="text-xs" style={{ color: "var(--ink-muted)" }}>{pack.perCredit} per credit</p>
            </div>
            <button
              onClick={() => handleBuy(pack.id)}
              disabled={buyingPack !== null}
              className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                pack.popular
                  ? "bg-accent text-white hover:bg-accent-soft0"
                  : "hover:opacity-80"
              }`}
              style={pack.popular ? undefined : { background: "var(--surface-2)", color: "var(--ink)" }}
            >
              {buyingPack === pack.id ? "Redirecting..." : "Buy"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
        Each AI-powered feature (search, risk narrative, anomaly explanation) costs 1 credit.
        Credits never expire.
      </p>
    </div>
  );
}
