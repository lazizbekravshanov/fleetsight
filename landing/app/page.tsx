import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/auth";

export default async function HomePage() {
  const session = await getServerAuthSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-12 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-blue-300">FleetSight</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Carrier Risk Intelligence</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Customer login, FMCSA QCMobile data lookup, and OpenClaw integration are fully wired.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-200">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
