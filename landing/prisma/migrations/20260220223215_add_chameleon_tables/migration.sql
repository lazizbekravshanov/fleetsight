-- CreateTable
CREATE TABLE "FmcsaCarrier" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "legalName" TEXT NOT NULL,
    "dbaName" TEXT,
    "phyStreet" TEXT,
    "phyCity" TEXT,
    "phyState" TEXT,
    "phyZip" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "cellPhone" TEXT,
    "companyOfficer1" TEXT,
    "companyOfficer2" TEXT,
    "statusCode" TEXT,
    "priorRevokeFlag" TEXT,
    "priorRevokeDot" INTEGER,
    "addDate" TIMESTAMP(3),
    "powerUnits" INTEGER,
    "totalDrivers" INTEGER,
    "fleetSize" TEXT,
    "docketPrefix" TEXT,
    "docketNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FmcsaCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FmcsaCrash" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "reportDate" TIMESTAMP(3),
    "reportNumber" TEXT,
    "state" TEXT,
    "fatalities" INTEGER NOT NULL DEFAULT 0,
    "injuries" INTEGER NOT NULL DEFAULT 0,
    "towAway" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FmcsaCrash_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FmcsaInspection" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "inspectionDate" TIMESTAMP(3),
    "vin" TEXT,
    "state" TEXT,
    "vehicleOosTotal" INTEGER NOT NULL DEFAULT 0,
    "driverOosTotal" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FmcsaInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierLink" (
    "id" TEXT NOT NULL,
    "dotNumberA" INTEGER NOT NULL,
    "dotNumberB" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "runId" TEXT NOT NULL,

    CONSTRAINT "CarrierLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierCluster" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "edgeCount" INTEGER NOT NULL,
    "avgLinkScore" DOUBLE PRECISION NOT NULL,
    "maxLinkScore" DOUBLE PRECISION NOT NULL,
    "runId" TEXT NOT NULL,

    CONSTRAINT "CarrierCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterMember" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,

    CONSTRAINT "ClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierRiskScore" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "chameleonScore" DOUBLE PRECISION NOT NULL,
    "safetyScore" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "signalsJson" TEXT NOT NULL,
    "clusterSize" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierRiskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FmcsaCarrier_dotNumber_key" ON "FmcsaCarrier"("dotNumber");

-- CreateIndex
CREATE INDEX "FmcsaCarrier_phone_idx" ON "FmcsaCarrier"("phone");

-- CreateIndex
CREATE INDEX "FmcsaCarrier_phyStreet_phyCity_phyState_idx" ON "FmcsaCarrier"("phyStreet", "phyCity", "phyState");

-- CreateIndex
CREATE INDEX "FmcsaCarrier_companyOfficer1_idx" ON "FmcsaCarrier"("companyOfficer1");

-- CreateIndex
CREATE INDEX "FmcsaCarrier_priorRevokeFlag_idx" ON "FmcsaCarrier"("priorRevokeFlag");

-- CreateIndex
CREATE INDEX "FmcsaCrash_dotNumber_idx" ON "FmcsaCrash"("dotNumber");

-- CreateIndex
CREATE INDEX "FmcsaInspection_dotNumber_idx" ON "FmcsaInspection"("dotNumber");

-- CreateIndex
CREATE INDEX "FmcsaInspection_vin_idx" ON "FmcsaInspection"("vin");

-- CreateIndex
CREATE INDEX "CarrierLink_dotNumberA_idx" ON "CarrierLink"("dotNumberA");

-- CreateIndex
CREATE INDEX "CarrierLink_dotNumberB_idx" ON "CarrierLink"("dotNumberB");

-- CreateIndex
CREATE INDEX "CarrierLink_score_idx" ON "CarrierLink"("score");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierLink_dotNumberA_dotNumberB_runId_key" ON "CarrierLink"("dotNumberA", "dotNumberB", "runId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierCluster_clusterId_runId_key" ON "CarrierCluster"("clusterId", "runId");

-- CreateIndex
CREATE INDEX "ClusterMember_dotNumber_idx" ON "ClusterMember"("dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterMember_clusterId_dotNumber_key" ON "ClusterMember"("clusterId", "dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierRiskScore_dotNumber_key" ON "CarrierRiskScore"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierRiskScore_compositeScore_idx" ON "CarrierRiskScore"("compositeScore");

-- CreateIndex
CREATE UNIQUE INDEX "SyncRun_runId_key" ON "SyncRun"("runId");

-- AddForeignKey
ALTER TABLE "FmcsaCrash" ADD CONSTRAINT "FmcsaCrash_dotNumber_fkey" FOREIGN KEY ("dotNumber") REFERENCES "FmcsaCarrier"("dotNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FmcsaInspection" ADD CONSTRAINT "FmcsaInspection_dotNumber_fkey" FOREIGN KEY ("dotNumber") REFERENCES "FmcsaCarrier"("dotNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterMember" ADD CONSTRAINT "ClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "CarrierCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterMember" ADD CONSTRAINT "ClusterMember_dotNumber_fkey" FOREIGN KEY ("dotNumber") REFERENCES "FmcsaCarrier"("dotNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierRiskScore" ADD CONSTRAINT "CarrierRiskScore_dotNumber_fkey" FOREIGN KEY ("dotNumber") REFERENCES "FmcsaCarrier"("dotNumber") ON DELETE CASCADE ON UPDATE CASCADE;
