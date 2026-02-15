import { prisma } from "@/lib/prisma";

declare global {
  var __fleetsightDbInitPromise: Promise<void> | undefined;
}

async function runMigrations() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
      "lockoutUntil" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "companyName" TEXT NOT NULL,
      "usdotNumber" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ApiToken" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "scope" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" DATETIME NOT NULL,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WebhookEvent" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "source" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "payloadJson" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerProfile_usdotNumber_idx" ON "CustomerProfile"("usdotNumber");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ApiToken_userId_idx" ON "ApiToken"("userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ApiToken_expiresAt_idx" ON "ApiToken"("expiresAt");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WebhookEvent_source_type_idx" ON "WebhookEvent"("source", "type");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");`);
}

export async function ensureDbInitialized() {
  if (!global.__fleetsightDbInitPromise) {
    global.__fleetsightDbInitPromise = runMigrations();
  }
  await global.__fleetsightDbInitPromise;
}
