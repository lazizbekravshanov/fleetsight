-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamWatchedCarrier" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "addedByUserId" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamWatchedCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamNote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VinObservation" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectionId" TEXT,
    "state" TEXT,
    "vehicleType" TEXT NOT NULL DEFAULT 'TRUCK',
    "unitMake" TEXT,
    "unitYear" INTEGER,
    "licensePlate" TEXT,
    "licenseState" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MCMIS',
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VinObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "modelYear" INTEGER,
    "bodyClass" TEXT,
    "vehicleType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierVehicle" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "vin" TEXT NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'TRUCK',
    "observationCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'inspection',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarrierVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierAffiliation" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT,
    "dotNumberA" INTEGER NOT NULL,
    "dotNumberB" INTEGER NOT NULL,
    "sharedVinCount" INTEGER NOT NULL,
    "affiliationScore" DOUBLE PRECISION NOT NULL,
    "affiliationType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "sharedVinsJson" TEXT NOT NULL DEFAULT '[]',
    "sigVinRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigTemporal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigConcurrent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigAddress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigName" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigOosReincarnation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sigFleetAbsorption" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasonsJson" TEXT NOT NULL DEFAULT '[]',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "CarrierAffiliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliationEdgeVin" (
    "id" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "vehicleType" TEXT,
    "unitMake" TEXT,
    "unitYear" INTEGER,
    "dotAFirstSeen" TIMESTAMP(3),
    "dotALastSeen" TIMESTAMP(3),
    "dotBFirstSeen" TIMESTAMP(3),
    "dotBLastSeen" TIMESTAMP(3),
    "overlapDays" INTEGER NOT NULL DEFAULT 0,
    "gapDays" INTEGER NOT NULL DEFAULT 0,
    "transferDirection" TEXT NOT NULL DEFAULT 'UNCLEAR',

    CONSTRAINT "AffiliationEdgeVin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliationCluster" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL,
    "dotNumbers" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "worstType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliationCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverObservation" (
    "id" TEXT NOT NULL,
    "cdlNumber" TEXT NOT NULL,
    "cdlState" TEXT NOT NULL,
    "cdlKey" TEXT NOT NULL,
    "driverName" TEXT,
    "dotNumber" INTEGER NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectionId" TEXT,
    "state" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MCMIS',
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierAddress" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "addressType" TEXT NOT NULL,
    "rawAddress" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "geohash" TEXT,

    CONSTRAINT "CarrierAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierPrincipal" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "principalName" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "title" TEXT,
    "sourceDate" TIMESTAMP(3),

    CONSTRAINT "CarrierPrincipal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierAgent" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "agentType" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentNormalized" TEXT NOT NULL,
    "agentAddress" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'FMCSA_LI',

    CONSTRAINT "CarrierAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierInsuranceRecord" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "insuranceType" TEXT,
    "insurerName" TEXT,
    "policyNumber" TEXT,
    "coverageAmount" INTEGER,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" TEXT,
    "lapseCount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'FMCSA_LI',

    CONSTRAINT "CarrierInsuranceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarrierTrustScore" (
    "id" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "identity" INTEGER NOT NULL DEFAULT 0,
    "safety" INTEGER NOT NULL DEFAULT 0,
    "insurance" INTEGER NOT NULL DEFAULT 0,
    "network" INTEGER NOT NULL DEFAULT 0,
    "operational" INTEGER NOT NULL DEFAULT 0,
    "compliance" INTEGER NOT NULL DEFAULT 0,
    "financial" INTEGER NOT NULL DEFAULT 0,
    "flagsJson" TEXT NOT NULL DEFAULT '[]',
    "clusterSize" INTEGER NOT NULL DEFAULT 0,
    "clusterAvgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oosProb90d" DOUBLE PRECISION,
    "trend" TEXT NOT NULL DEFAULT 'STABLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierTrustScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoredRoster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonitoredRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterCarrier" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastGrade" TEXT,
    "lastScore" INTEGER,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterCarrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReportSummary" (
    "dotNumber" TEXT NOT NULL,
    "totalReports12m" INTEGER NOT NULL DEFAULT 0,
    "reportsByType" TEXT NOT NULL DEFAULT '{}',
    "communityScore" INTEGER NOT NULL DEFAULT 0,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "lastReportAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityReportSummary_pkey" PRIMARY KEY ("dotNumber")
);

-- CreateTable
CREATE TABLE "ApiKeyUsage" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "dotNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKeyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionViolation" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "dotNumber" INTEGER NOT NULL,
    "vinClean" TEXT,
    "cdlKey" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectionLevel" INTEGER,
    "inspectionState" TEXT,
    "inspectionFacility" TEXT,
    "violationCode" TEXT NOT NULL,
    "violationGroup" TEXT,
    "violationDescription" TEXT,
    "oosViolation" BOOLEAN NOT NULL DEFAULT false,
    "violationSeverity" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MCMIS',
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViolationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'other',
    "fixAction" TEXT,
    "checkItem" TEXT,

    CONSTRAINT "ViolationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enabler" (
    "id" TEXT NOT NULL,
    "enablerType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "address" TEXT,
    "addressNormalized" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "clientCount" INTEGER NOT NULL DEFAULT 0,
    "activeClientCount" INTEGER NOT NULL DEFAULT 0,
    "oosClientCount" INTEGER NOT NULL DEFAULT 0,
    "chameleonClientCount" INTEGER NOT NULL DEFAULT 0,
    "avgClientLifespanDays" INTEGER,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskTier" TEXT,
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enabler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnablerCarrierLink" (
    "id" TEXT NOT NULL,
    "enablerId" TEXT NOT NULL,
    "dotNumber" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "terminationDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnablerCarrierLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "Team_slug_idx" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "TeamWatchedCarrier_teamId_idx" ON "TeamWatchedCarrier"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamWatchedCarrier_teamId_dotNumber_key" ON "TeamWatchedCarrier"("teamId", "dotNumber");

-- CreateIndex
CREATE INDEX "TeamNote_teamId_dotNumber_idx" ON "TeamNote"("teamId", "dotNumber");

-- CreateIndex
CREATE INDEX "VinObservation_vin_idx" ON "VinObservation"("vin");

-- CreateIndex
CREATE INDEX "VinObservation_dotNumber_idx" ON "VinObservation"("dotNumber");

-- CreateIndex
CREATE INDEX "VinObservation_inspectionDate_idx" ON "VinObservation"("inspectionDate");

-- CreateIndex
CREATE INDEX "VinObservation_vin_dotNumber_idx" ON "VinObservation"("vin", "dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VinObservation_vin_dotNumber_inspectionDate_key" ON "VinObservation"("vin", "dotNumber", "inspectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_make_idx" ON "Vehicle"("make");

-- CreateIndex
CREATE INDEX "Vehicle_modelYear_idx" ON "Vehicle"("modelYear");

-- CreateIndex
CREATE INDEX "CarrierVehicle_dotNumber_idx" ON "CarrierVehicle"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierVehicle_vin_idx" ON "CarrierVehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierVehicle_dotNumber_vin_key" ON "CarrierVehicle"("dotNumber", "vin");

-- CreateIndex
CREATE INDEX "CarrierAffiliation_dotNumberA_idx" ON "CarrierAffiliation"("dotNumberA");

-- CreateIndex
CREATE INDEX "CarrierAffiliation_dotNumberB_idx" ON "CarrierAffiliation"("dotNumberB");

-- CreateIndex
CREATE INDEX "CarrierAffiliation_affiliationScore_idx" ON "CarrierAffiliation"("affiliationScore");

-- CreateIndex
CREATE INDEX "CarrierAffiliation_affiliationType_idx" ON "CarrierAffiliation"("affiliationType");

-- CreateIndex
CREATE INDEX "CarrierAffiliation_clusterId_idx" ON "CarrierAffiliation"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierAffiliation_dotNumberA_dotNumberB_key" ON "CarrierAffiliation"("dotNumberA", "dotNumberB");

-- CreateIndex
CREATE INDEX "AffiliationEdgeVin_edgeId_idx" ON "AffiliationEdgeVin"("edgeId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliationEdgeVin_edgeId_vin_key" ON "AffiliationEdgeVin"("edgeId", "vin");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliationCluster_clusterId_key" ON "AffiliationCluster"("clusterId");

-- CreateIndex
CREATE INDEX "DriverObservation_cdlKey_idx" ON "DriverObservation"("cdlKey");

-- CreateIndex
CREATE INDEX "DriverObservation_dotNumber_idx" ON "DriverObservation"("dotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DriverObservation_cdlKey_dotNumber_inspectionDate_key" ON "DriverObservation"("cdlKey", "dotNumber", "inspectionDate");

-- CreateIndex
CREATE INDEX "CarrierAddress_normalized_idx" ON "CarrierAddress"("normalized");

-- CreateIndex
CREATE INDEX "CarrierAddress_dotNumber_idx" ON "CarrierAddress"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierAddress_geohash_idx" ON "CarrierAddress"("geohash");

-- CreateIndex
CREATE INDEX "CarrierAddress_city_state_idx" ON "CarrierAddress"("city", "state");

-- CreateIndex
CREATE INDEX "CarrierPrincipal_nameNormalized_idx" ON "CarrierPrincipal"("nameNormalized");

-- CreateIndex
CREATE INDEX "CarrierPrincipal_dotNumber_idx" ON "CarrierPrincipal"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierAgent_agentNormalized_idx" ON "CarrierAgent"("agentNormalized");

-- CreateIndex
CREATE INDEX "CarrierAgent_dotNumber_idx" ON "CarrierAgent"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierInsuranceRecord_dotNumber_idx" ON "CarrierInsuranceRecord"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierInsuranceRecord_insurerName_idx" ON "CarrierInsuranceRecord"("insurerName");

-- CreateIndex
CREATE INDEX "CarrierInsuranceRecord_status_idx" ON "CarrierInsuranceRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CarrierTrustScore_dotNumber_key" ON "CarrierTrustScore"("dotNumber");

-- CreateIndex
CREATE INDEX "CarrierTrustScore_overallScore_idx" ON "CarrierTrustScore"("overallScore");

-- CreateIndex
CREATE INDEX "CarrierTrustScore_grade_idx" ON "CarrierTrustScore"("grade");

-- CreateIndex
CREATE INDEX "MonitoredRoster_userId_idx" ON "MonitoredRoster"("userId");

-- CreateIndex
CREATE INDEX "RosterCarrier_rosterId_idx" ON "RosterCarrier"("rosterId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterCarrier_rosterId_dotNumber_key" ON "RosterCarrier"("rosterId", "dotNumber");

-- CreateIndex
CREATE INDEX "MonitoringAlert_userId_createdAt_idx" ON "MonitoringAlert"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MonitoringAlert_userId_readAt_idx" ON "MonitoringAlert"("userId", "readAt");

-- CreateIndex
CREATE INDEX "CommunityReport_dotNumber_createdAt_idx" ON "CommunityReport"("dotNumber", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityReport_dotNumber_status_idx" ON "CommunityReport"("dotNumber", "status");

-- CreateIndex
CREATE INDEX "CommunityReport_userId_dotNumber_reportType_idx" ON "CommunityReport"("userId", "dotNumber", "reportType");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityReportSummary_dotNumber_key" ON "CommunityReportSummary"("dotNumber");

-- CreateIndex
CREATE INDEX "ApiKeyUsage_tokenId_createdAt_idx" ON "ApiKeyUsage"("tokenId", "createdAt");

-- CreateIndex
CREATE INDEX "InspectionViolation_dotNumber_idx" ON "InspectionViolation"("dotNumber");

-- CreateIndex
CREATE INDEX "InspectionViolation_vinClean_idx" ON "InspectionViolation"("vinClean");

-- CreateIndex
CREATE INDEX "InspectionViolation_cdlKey_idx" ON "InspectionViolation"("cdlKey");

-- CreateIndex
CREATE INDEX "InspectionViolation_violationCode_idx" ON "InspectionViolation"("violationCode");

-- CreateIndex
CREATE INDEX "InspectionViolation_violationGroup_idx" ON "InspectionViolation"("violationGroup");

-- CreateIndex
CREATE INDEX "InspectionViolation_inspectionDate_idx" ON "InspectionViolation"("inspectionDate");

-- CreateIndex
CREATE INDEX "InspectionViolation_inspectionFacility_idx" ON "InspectionViolation"("inspectionFacility");

-- CreateIndex
CREATE UNIQUE INDEX "InspectionViolation_inspectionId_violationCode_key" ON "InspectionViolation"("inspectionId", "violationCode");

-- CreateIndex
CREATE UNIQUE INDEX "ViolationCode_code_key" ON "ViolationCode"("code");

-- CreateIndex
CREATE INDEX "ViolationCode_groupName_idx" ON "ViolationCode"("groupName");

-- CreateIndex
CREATE INDEX "Enabler_nameNormalized_idx" ON "Enabler"("nameNormalized");

-- CreateIndex
CREATE INDEX "Enabler_enablerType_idx" ON "Enabler"("enablerType");

-- CreateIndex
CREATE INDEX "Enabler_riskScore_idx" ON "Enabler"("riskScore");

-- CreateIndex
CREATE INDEX "Enabler_phoneNormalized_idx" ON "Enabler"("phoneNormalized");

-- CreateIndex
CREATE INDEX "EnablerCarrierLink_enablerId_idx" ON "EnablerCarrierLink"("enablerId");

-- CreateIndex
CREATE INDEX "EnablerCarrierLink_dotNumber_idx" ON "EnablerCarrierLink"("dotNumber");

-- CreateIndex
CREATE INDEX "EnablerCarrierLink_isCurrent_idx" ON "EnablerCarrierLink"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "EnablerCarrierLink_enablerId_dotNumber_relationship_key" ON "EnablerCarrierLink"("enablerId", "dotNumber", "relationship");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamWatchedCarrier" ADD CONSTRAINT "TeamWatchedCarrier_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierVehicle" ADD CONSTRAINT "CarrierVehicle_dotNumber_fkey" FOREIGN KEY ("dotNumber") REFERENCES "FmcsaCarrier"("dotNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarrierVehicle" ADD CONSTRAINT "CarrierVehicle_vin_fkey" FOREIGN KEY ("vin") REFERENCES "Vehicle"("vin") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliationEdgeVin" ADD CONSTRAINT "AffiliationEdgeVin_edgeId_fkey" FOREIGN KEY ("edgeId") REFERENCES "CarrierAffiliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoredRoster" ADD CONSTRAINT "MonitoredRoster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterCarrier" ADD CONSTRAINT "RosterCarrier_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "MonitoredRoster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityReport" ADD CONSTRAINT "CommunityReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKeyUsage" ADD CONSTRAINT "ApiKeyUsage_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "ApiToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnablerCarrierLink" ADD CONSTRAINT "EnablerCarrierLink_enablerId_fkey" FOREIGN KEY ("enablerId") REFERENCES "Enabler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

