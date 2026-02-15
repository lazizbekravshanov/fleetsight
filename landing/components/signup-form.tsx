"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      if (res.status === 429) {
        setError(`Too many attempts. Retry in ${body.retryAfterSec || 0}s.`);
      } else {
        setError(body.error || "Unable to create account.");
      }
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (login?.ok) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <label className="block text-sm font-medium text-slate-200">
        Work Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-blue-500 focus:ring"
        />
      </label>
      <label className="block text-sm font-medium text-slate-200">
        Password
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-blue-500 focus:ring"
        />
      </label>
      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>
      <p className="text-sm text-slate-300">
        Already registered? <Link href="/login" className="text-blue-300 underline">Sign in</Link>
      </p>
    </form>
  );
}
