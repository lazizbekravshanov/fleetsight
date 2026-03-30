import Link from "next/link";

export default function CreditsCancelPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="mx-auto max-w-sm rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Purchase Cancelled</h1>
        <p className="mt-1 text-sm text-gray-500">
          No charges were made. You can try again anytime.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/credits"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Back to Credits
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Return to Search
          </Link>
        </div>
      </div>
    </main>
  );
}
