import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  schemaPushed?: boolean;
};

// On Vercel with file-based SQLite, the /tmp DB doesn't persist from build
// to runtime. Push the schema on first cold start to ensure tables exist.
if (!globalForPrisma.schemaPushed && process.env.DATABASE_URL?.startsWith("file:")) {
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "pipe",
      timeout: 10_000,
    });
  } catch {
    // Non-fatal — tables may already exist
  }
  globalForPrisma.schemaPushed = true;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
