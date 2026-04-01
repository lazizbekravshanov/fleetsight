import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-surface-0 text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] text-accent transition hover:text-accent"
          >
            FLEETSIGHT
          </Link>
          <Link
            href="/signup"
            className="text-sm text-ink-soft transition hover:text-ink"
          >
            Create account
          </Link>
        </div>
        <div className="animate-fade-in rounded-2xl border border-border bg-surface-1 shadow-sm sm:p-0">
          <div className="grid sm:grid-cols-[1.1fr_1fr]">
            {/* Left: Info panel */}
            <section className="p-6 sm:p-10">
              <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 max-w-md text-ink-soft">{subtitle}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Real FMCSA QCMobile API lookups
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Customer-scoped OpenClaw token integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                  Server-side secure key handling
                </li>
              </ul>
            </section>
            {/* Right: Form */}
            <section className="border-t border-border p-6 sm:border-l sm:border-t-0 sm:p-10">
              {children}
            </section>
          </div>
        </div>
        {footer && (
          <div className="mt-6 text-sm text-ink-soft">{footer}</div>
        )}
      </div>
    </main>
  );
}
