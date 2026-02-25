"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCredits } from "@/components/credits/credits-context";

const PACKS = [
  { id: "pack_50", credits: 50, price: "$5", perCredit: "$0.10", popular: false },
  { id: "pack_200", credits: 200, price: "$15", perCredit: "$0.075", popular: true },
  { id: "pack_500", credits: 500, price: "$30", perCredit: "$0.06", popular: false },
];

export default function CreditsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { credits, loading: creditsLoading } = useCredits();
  const [buyingPack, setBuyingPack] = useState<string | null>(null);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide text-indigo-600">
            FleetSight
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900">AI Credits</h1>
          <p className="mt-2 text-sm text-gray-500">
            Power AI-driven search, risk narratives, and anomaly analysis
          </p>
        </div>

        {/* Current balance */}
        <div className="mx-auto mt-8 max-w-sm rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Current Balance
          </p>
          <p className="mt-1 text-4xl font-bold text-gray-900">
            {creditsLoading ? "..." : credits ?? 0}
          </p>
          <p className="text-sm text-gray-500">credits</p>
        </div>

        {/* Packs */}
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`relative rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
                pack.popular ? "border-indigo-300 ring-2 ring-indigo-500/20" : "border-gray-200"
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-semibold text-white">
                  Best Value
                </span>
              )}
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{pack.credits}</p>
                <p className="text-sm text-gray-500">credits</p>
                <p className="mt-3 text-2xl font-semibold text-gray-900">{pack.price}</p>
                <p className="text-xs text-gray-400">{pack.perCredit} per credit</p>
              </div>
              <button
                onClick={() => handleBuy(pack.id)}
                disabled={buyingPack !== null}
                className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                  pack.popular
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {buyingPack === pack.id ? "Redirecting..." : "Buy"}
              </button>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Each AI-powered feature (search, risk narrative, anomaly explanation) costs 1 credit.
          Credits never expire.
        </p>
      </div>
    </main>
  );
}
