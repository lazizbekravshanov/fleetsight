"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

type CreditsContextType = {
  credits: number | null;
  loading: boolean;
  refreshCredits: () => Promise<void>;
};

const CreditsContext = createContext<CreditsContextType>({
  credits: null,
  loading: false,
  refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshCredits = useCallback(async () => {
    if (!session?.user) {
      setCredits(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/credits/balance");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {
      // Silently fail — credits will show as null
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (status === "authenticated") {
      refreshCredits();
    } else if (status === "unauthenticated") {
      setCredits(null);
    }
  }, [status, refreshCredits]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
