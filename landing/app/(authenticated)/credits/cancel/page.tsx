import Link from "next/link";

export default function CreditsCancelPage() {
  return (
    <main className="min-h-screen bg-surface-0 flex items-center justify-center">
      <div className="mx-auto max-w-sm rounded-xl border border-border bg-surface-1 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-soft">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">Purchase Cancelled</h1>
        <p className="mt-1 text-sm text-ink-soft">
          No charges were made. You can try again anytime.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/credits"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Back to Credits
          </Link>
          <Link
            href="/"
            className="text-sm text-ink-soft hover:text-ink-soft"
          >
            Return to Search
          </Link>
        </div>
      </div>
    </main>
  );
}
