"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

type AttemptsResponse = {
  locked: boolean;
  lockedUntil: string | null;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.ok) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    const attempts = await fetch(`/api/auth/attempts?email=${encodeURIComponent(email)}`, {
      method: "GET"
    }).then((r) => r.json() as Promise<AttemptsResponse>);

    if (attempts.locked) {
      setLockedUntil(attempts.lockedUntil);
      setError("Too many login attempts. Account temporarily locked.");
    } else {
      setError("Invalid credentials. Try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-5">
      <label className="block text-sm font-medium text-slate-200">
        Email
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
          {lockedUntil ? ` Locked until ${new Date(lockedUntil).toLocaleString()}.` : ""}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-sm text-slate-300">
        New customer? <Link href="/signup" className="text-blue-300 underline">Create your account</Link>
      </p>
    </form>
  );
}
