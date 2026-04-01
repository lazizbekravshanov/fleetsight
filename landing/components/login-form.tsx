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
      redirect: false,
    });

    if (result?.ok) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    const attempts = await fetch(
      `/api/auth/attempts?email=${encodeURIComponent(email)}`,
      { method: "GET" }
    ).then((r) => r.json() as Promise<AttemptsResponse>);

    if (attempts.locked) {
      setLockedUntil(attempts.lockedUntil);
      setError("Too many login attempts. Account temporarily locked.");
    } else {
      setError("Invalid credentials. Try again.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="you@company.com"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink-soft">Password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="Min. 8 characters"
        />
      </label>
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
          {error}
          {lockedUntil
            ? ` Locked until ${new Date(lockedUntil).toLocaleString()}.`
            : ""}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        New customer?{" "}
        <Link
          href="/signup"
          className="font-medium text-accent transition hover:text-accent"
        >
          Create your account
        </Link>
      </p>
    </form>
  );
}
