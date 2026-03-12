-- CreateTable
CREATE TABLE "WatchedCarrier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "lastUsdotStatus" TEXT,
    "lastAuthStatus" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchedCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WatchedCarrier_userId_dotNumber_key" ON "WatchedCarrier"("userId", "dotNumber");

-- CreateIndex
CREATE INDEX "WatchedCarrier_userId_idx" ON "WatchedCarrier"("userId");

-- CreateIndex
CREATE INDEX "SearchHistory_userId_searchedAt_idx" ON "SearchHistory"("userId", "searchedAt");

-- AddForeignKey
ALTER TABLE "WatchedCarrier" ADD CONSTRAINT "WatchedCarrier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchHistory" ADD CONSTRAINT "SearchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
