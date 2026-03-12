-- CreateTable
CREATE TABLE "CarrierNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarrierNote_userId_dotNumber_idx" ON "CarrierNote"("userId", "dotNumber");

-- AddForeignKey
ALTER TABLE "CarrierNote" ADD CONSTRAINT "CarrierNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
