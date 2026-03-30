"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CreditsProvider } from "@/components/credits/credits-context";
import { CopilotWrapper } from "@/components/chat/copilot-wrapper";
import { PWARegister } from "@/components/pwa-register";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <SessionProvider>
        <CreditsProvider>
          {children}
          <CopilotWrapper />
          <PWARegister />
        </CreditsProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
