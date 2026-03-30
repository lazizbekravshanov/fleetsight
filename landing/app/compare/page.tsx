import Link from "next/link";
import { CarrierCompare } from "@/components/compare/carrier-compare";

export const metadata = {
  title: "Compare Carriers | FleetSight",
  description: "Side-by-side comparison of up to 4 carriers by USDOT number.",
};

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-[#09090b] dark:text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-gray-500 transition hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 3L4.5 7l4 4" />
              </svg>
              Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="5" height="10" rx="1" />
                <rect x="10" y="3" width="5" height="10" rx="1" />
                <path d="M8 5v6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">
                Carrier Comparison
              </h1>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Compare safety, operations, and risk across multiple carriers
              </p>
            </div>
          </div>
        </header>

        <CarrierCompare />
      </div>
    </main>
  );
}
