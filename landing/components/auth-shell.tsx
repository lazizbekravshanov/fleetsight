import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] text-blue-300">
            FLEETSIGHT
          </Link>
          <Link href="/signup" className="text-sm text-slate-300 hover:text-white">
            Create account
          </Link>
        </div>
        <div className="grid gap-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:grid-cols-[1.1fr_1fr] sm:p-10">
          <section>
            <h1 className="text-3xl font-semibold">{title}</h1>
            <p className="mt-3 max-w-md text-slate-300">{subtitle}</p>
            <ul className="mt-6 space-y-2 text-sm text-slate-400">
              <li>Real FMCSA QCMobile API lookups</li>
              <li>Customer-scoped OpenClaw token integration</li>
              <li>Server-side secure key handling</li>
            </ul>
          </section>
          <section>{children}</section>
        </div>
        {footer ? <div className="mt-6 text-sm text-slate-400">{footer}</div> : null}
      </div>
    </main>
  );
}
