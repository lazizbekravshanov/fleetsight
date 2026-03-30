"use client";

import { useSession } from "next-auth/react";
import { AICopilot } from "./ai-copilot";

export function CopilotWrapper() {
  const { data: session } = useSession();
  if (!session) return null;
  return <AICopilot />;
}
