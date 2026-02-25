"use client";

import { SessionProvider } from "next-auth/react";
import { CreditsProvider } from "@/components/credits/credits-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CreditsProvider>{children}</CreditsProvider>
    </SessionProvider>
  );
}
