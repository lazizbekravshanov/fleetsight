import { ChameleonDashboard } from "@/components/chameleon/chameleon-dashboard";
import Link from "next/link";

export default function ChameleonPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-slate-400 transition hover:text-slate-200"
            >
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-200">Chameleon Detection</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold">
            Chameleon Carrier Detection
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Detect reincarnated carriers using FMCSA data — shared addresses,
            phones, officers, VINs, and prior-revocation links.
          </p>
        </header>

        <ChameleonDashboard />
      </div>
    </main>
  );
}
