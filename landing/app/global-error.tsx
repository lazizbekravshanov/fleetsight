"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Something went wrong</h2>
          <p style={{ color: "#6b7280", marginBottom: "16px" }}>An unexpected error occurred.</p>
          <button
            onClick={() => reset()}
            style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 20px", fontSize: "14px", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
