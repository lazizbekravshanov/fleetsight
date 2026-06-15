import { PrismaClient } from "@prisma/client";
import { validateServerEnv } from "./env-check";

// Validate required env vars on first server-side import. This throws in
// production if DATABASE_URL or NEXTAUTH_SECRET are missing, so the process
// refuses to serve traffic rather than 500 on the first query.
validateServerEnv();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
