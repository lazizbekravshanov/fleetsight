"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg border border-border px-3 py-2 text-sm text-ink-soft hover:bg-surface-0"
    >
      Sign out
    </button>
  );
}
