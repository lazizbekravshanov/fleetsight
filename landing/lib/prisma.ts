import { PrismaClient } from "@prisma/client";
import { validateServerEnv } from "./env-check";

// Validate required env vars on first server-side import. This throws in
// production if DATABASE_URL or NEXTAUTH_SECRET are missing, so the process
// refuses to serve traffic rather than 500 on the first query.
validateServerEnv();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  schemaPushed?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// On Vercel with file-based SQLite, the /tmp DB doesn't persist from build
// to runtime. Create new tables on first cold start via raw SQL.
if (!globalForPrisma.schemaPushed) {
  globalForPrisma.schemaPushed = true;
  const ddl = [
    `CREATE TABLE IF NOT EXISTS "InspectionViolation" ("id" TEXT NOT NULL PRIMARY KEY, "inspectionId" TEXT NOT NULL, "dotNumber" INTEGER NOT NULL, "vinClean" TEXT, "cdlKey" TEXT, "inspectionDate" DATETIME NOT NULL, "inspectionLevel" INTEGER, "inspectionState" TEXT, "inspectionFacility" TEXT, "violationCode" TEXT NOT NULL, "violationGroup" TEXT, "violationDescription" TEXT, "oosViolation" BOOLEAN NOT NULL DEFAULT false, "violationSeverity" TEXT, "source" TEXT NOT NULL DEFAULT 'MCMIS', "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "InspectionViolation_inspectionId_violationCode_key" ON "InspectionViolation"("inspectionId", "violationCode")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_dotNumber_idx" ON "InspectionViolation"("dotNumber")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_vinClean_idx" ON "InspectionViolation"("vinClean")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_cdlKey_idx" ON "InspectionViolation"("cdlKey")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_violationCode_idx" ON "InspectionViolation"("violationCode")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_violationGroup_idx" ON "InspectionViolation"("violationGroup")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_inspectionDate_idx" ON "InspectionViolation"("inspectionDate")`,
    `CREATE INDEX IF NOT EXISTS "InspectionViolation_inspectionFacility_idx" ON "InspectionViolation"("inspectionFacility")`,
    `CREATE TABLE IF NOT EXISTS "ViolationCode" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "groupName" TEXT NOT NULL, "section" TEXT NOT NULL, "description" TEXT NOT NULL, "severity" TEXT NOT NULL DEFAULT 'other', "fixAction" TEXT, "checkItem" TEXT)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ViolationCode_code_key" ON "ViolationCode"("code")`,
    `CREATE INDEX IF NOT EXISTS "ViolationCode_groupName_idx" ON "ViolationCode"("groupName")`,
    `CREATE TABLE IF NOT EXISTS "Enabler" ("id" TEXT NOT NULL PRIMARY KEY, "enablerType" TEXT NOT NULL, "name" TEXT NOT NULL, "nameNormalized" TEXT NOT NULL, "address" TEXT, "addressNormalized" TEXT, "city" TEXT, "state" TEXT, "zip" TEXT, "phone" TEXT, "phoneNormalized" TEXT, "lat" REAL, "lng" REAL, "clientCount" INTEGER NOT NULL DEFAULT 0, "activeClientCount" INTEGER NOT NULL DEFAULT 0, "oosClientCount" INTEGER NOT NULL DEFAULT 0, "chameleonClientCount" INTEGER NOT NULL DEFAULT 0, "avgClientLifespanDays" INTEGER, "riskScore" REAL NOT NULL DEFAULT 0, "riskTier" TEXT, "firstSeenAt" DATETIME, "lastSeenAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS "Enabler_nameNormalized_idx" ON "Enabler"("nameNormalized")`,
    `CREATE INDEX IF NOT EXISTS "Enabler_enablerType_idx" ON "Enabler"("enablerType")`,
    `CREATE INDEX IF NOT EXISTS "Enabler_riskScore_idx" ON "Enabler"("riskScore")`,
    `CREATE INDEX IF NOT EXISTS "Enabler_phoneNormalized_idx" ON "Enabler"("phoneNormalized")`,
    `CREATE TABLE IF NOT EXISTS "EnablerCarrierLink" ("id" TEXT NOT NULL PRIMARY KEY, "enablerId" TEXT NOT NULL, "dotNumber" TEXT NOT NULL, "relationship" TEXT NOT NULL, "effectiveDate" DATETIME, "terminationDate" DATETIME, "isCurrent" BOOLEAN NOT NULL DEFAULT true, "source" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EnablerCarrierLink_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "Enabler" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "EnablerCarrierLink_enablerId_dotNumber_relationship_key" ON "EnablerCarrierLink"("enablerId", "dotNumber", "relationship")`,
    `CREATE INDEX IF NOT EXISTS "EnablerCarrierLink_enablerId_idx" ON "EnablerCarrierLink"("enablerId")`,
    `CREATE INDEX IF NOT EXISTS "EnablerCarrierLink_dotNumber_idx" ON "EnablerCarrierLink"("dotNumber")`,
    `CREATE INDEX IF NOT EXISTS "EnablerCarrierLink_isCurrent_idx" ON "EnablerCarrierLink"("isCurrent")`,
  ];
  Promise.all(ddl.map((sql) => prisma.$executeRawUnsafe(sql).catch(() => {}))).catch(() => {});
}
