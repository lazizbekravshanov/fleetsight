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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] text-indigo-600 transition hover:text-indigo-700"
          >
            FLEETSIGHT
          </Link>
          <Link
            href="/signup"
            className="text-sm text-gray-500 transition hover:text-gray-900"
          >
            Create account
          </Link>
        </div>
        <div className="animate-fade-in rounded-2xl border border-gray-200 bg-white shadow-sm sm:p-0">
          <div className="grid sm:grid-cols-[1.1fr_1fr]">
            {/* Left: Info panel */}
            <section className="p-6 sm:p-10">
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-3 max-w-md text-gray-600">{subtitle}</p>
              <ul className="mt-6 space-y-2.5 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Real FMCSA QCMobile API lookups
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Customer-scoped OpenClaw token integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Server-side secure key handling
                </li>
              </ul>
            </section>
            {/* Right: Form */}
            <section className="border-t border-gray-200 p-6 sm:border-l sm:border-t-0 sm:p-10">
              {children}
            </section>
          </div>
        </div>
        {footer && (
          <div className="mt-6 text-sm text-gray-500">{footer}</div>
        )}
      </div>
    </main>
  );
}
