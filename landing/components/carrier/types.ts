import type { SocrataCarrier, SocrataInspection, SocrataCrash, SocrataInsurance, SocrataAuthorityHistory } from "@/lib/socrata";

export type SearchResult = {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  statusCode: string | null;
  phyState: string | null;
  powerUnits: number | null;
  classdef: string | null;
  businessOrgDesc: string | null;
  addDate?: string | null;
  mcNumber?: string | null;
  riskIndicator?: { grade: "A" | "B" | "C" | "D" | "F"; score: number };
};

export type RiskFactor = {
  category: string;
  label: string;
  value: number;
  weight: number;
  weightedScore: number;
  severity: "critical" | "elevated" | "low";
  detail: string;
};

export type RiskScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  factors: RiskFactor[];
};

export type VoipResult = {
  isLikelyVoip: boolean;
  reason: string | null;
  provider: string | null;
};

export type SosResult = {
  found: boolean;
  matchQuality: "exact" | "partial" | "none";
  registrationStatus: string | null;
  registeredName: string | null;
  jurisdiction: string | null;
  opencorporatesUrl: string | null;
};

export type BasicScore = {
  name: string;
  percentile: number;
  totalViolations: number;
  totalInspections: number;
  serious: number;
  measureValue: number;
  rdDeficient: boolean;
  code: string;
};

export type PeerBenchmark = {
  avgPowerUnits: number;
  avgDrivers: number;
  avgOosRate: number;
  carrierCount: number;
};

export type NhtsaComplaint = {
  odiNumber: string;
  manufacturer: string;
  crash: boolean;
  fire: boolean;
  numberOfInjuries: number;
  numberOfDeaths: number;
  dateComplaintFiled: string;
  dateOfIncident: string;
  summary: string;
  components: string;
  make: string;
  model: string;
  modelYear: string;
};

export type FleetData = {
  units: FleetUnit[];
  decodedVehicles: NhtsaDecodedVin[];
  recalls: NhtsaRecall[];
  complaints: NhtsaComplaint[];
};

export type FleetUnit = {
  inspection_id: string;
  insp_unit_id?: string;
  insp_unit_type_id?: string;
  insp_unit_make?: string;
  insp_unit_vehicle_id_number?: string;
  insp_unit_license?: string;
  insp_unit_license_state?: string;
};

export type NhtsaDecodedVin = {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  bodyClass: string;
  gvwr: string;
  vehicleType: string;
};

export type NhtsaRecall = {
  nhtsaCampaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  make: string;
  model: string;
  modelYear: string;
};

export type FmcsaStatus = {
  usdotStatus: string | null;
  operatingAuthorityStatus: string | null;
  hasActiveOos: boolean;
  oosDate?: string | null;
  oosReason?: string | null;
};

export type CarrierDetail = {
  carrier: SocrataCarrier;
  basics: unknown;
  authority: unknown;
  oos: unknown;
  peerBenchmark: PeerBenchmark | null;
  safetyRating?: string | null;
  safetyRatingDate?: string | null;
  smartwayPartner?: boolean;
  fmcsaStatus?: FmcsaStatus | null;
  inspectionCount?: number;
  crashCount?: number;
  voip?: VoipResult;
  sosResult?: SosResult;
  affiliatedCarriers?: { dotNumber: string; legalName: string; statusCode?: string }[];
  communityReportSummary?: CommunityReportData | null;
  // Lazy-loaded fields (populated after tab activation)
  inspections?: SocrataInspection[];
  crashes?: SocrataCrash[];
  insurance?: SocrataInsurance[];
  authorityHistory?: SocrataAuthorityHistory[];
};

export type InspectionsData = {
  inspections: SocrataInspection[];
};

export type CrashesData = {
  crashes: SocrataCrash[];
};

export type InsuranceData = {
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
};

export type Tab = "overview" | "safety" | "inspections" | "crashes" | "insurance" | "fleet" | "detection" | "affiliations" | "background" | "notes" | "reports" | "vulnerability" | "cost-impact" | "drivers" | "enforcement" | "enablers";

export type SharedVinInfo = {
  vin: string;
  vehicleType: string;
  overlapDays: number;
  gapDays: number;
  transferDirection: "A_TO_B" | "B_TO_A" | "CONCURRENT" | "UNCLEAR";
  carrierAFirstSeen: string | null;
  carrierALastSeen: string | null;
  carrierBFirstSeen: string | null;
  carrierBLastSeen: string | null;
};

export type SignalBreakdown = {
  sharedVinRatio: number;
  temporalPattern: number;
  concurrentOps: number;
  addressMatch: number;
  nameMatch: number;
  oosReincarnation: number;
  fleetAbsorption: number;
};

export type AffiliationEntry = {
  dotNumber: number;
  legalName: string | null;
  statusCode: string | null;
  sharedVinCount: number;
  sharedVins: SharedVinInfo[];
  score: number;
  type: string;
  signals: SignalBreakdown;
  reasons: string[];
};

export type AffiliationsData = {
  dotNumber: number;
  totalVins: number;
  affiliatedCarrierCount: number;
  totalSharedVinCount: number;
  cluster: { id: string; members: number[] } | null;
  affiliations: AffiliationEntry[];
};

export type CommunityReportData = {
  totalReports12m: number;
  communityScore: number;
  isFlagged: boolean;
  reportsByType: Record<string, number>;
  lastReportAt: string | null;
};

/* ── Background Check Types ─────────────────────────────────── */

export type OfficerCrossRef = {
  officerName: string;
  carriers: { dotNumber: string; legalName: string; statusCode?: string }[];
};

export type OfacMatch = {
  queriedName: string;
  matchedName: string;
  score: number;
  sdnType: string;
  programs: string[];
};

export type SamExclusion = {
  name: string;
  classification: string;
  exclusionType: string;
  agency: string;
  activeDateRange: string;
};

export type EdgarFiling = {
  companyName: string;
  formType: string;
  dateFiled: string;
  description: string;
  url: string;
};

export type CourtCase = {
  caseName: string;
  court: string;
  docketNumber: string;
  dateFiled: string;
  status: string;
  url: string;
};

export type OcOfficerRole = {
  companyName: string;
  companyNumber: string;
  jurisdiction: string;
  status: string;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
  opencorporatesUrl: string;
};

export type OcOfficerCompany = {
  officerName: string;
  companies: OcOfficerRole[];
};

export type OcCompanyOfficer = {
  name: string;
  position: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type OcCompanyDetail = {
  companyNumber: string;
  name: string;
  jurisdiction: string;          // e.g. "us_il"
  jurisdictionLabel: string;     // e.g. "Illinois"
  status: string | null;
  companyType: string | null;
  incorporationDate: string | null;
  dissolutionDate: string | null;
  registeredAddress: string | null;
  officers: OcCompanyOfficer[];
  registryUrl: string | null;
  opencorporatesUrl: string | null;
};

export type CorporateNetworkSignal = {
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
};

export type CorporateNetwork = {
  companyRegistrations: OcCompanyDetail[];
  riskSignals: CorporateNetworkSignal[];
};

export type OfficerProfile = {
  name: string;
  /** Other FMCSA-registered carriers listing this officer */
  carrierRefs: { dotNumber: string; legalName: string; statusCode?: string }[];
  /** Corporate roles at other companies (OpenCorporates) */
  corporateRoles: OcOfficerRole[];
  /** OFAC SDN matches attributed to this officer */
  ofacMatches: OfacMatch[];
  /** SAM.gov exclusions attributed to this officer */
  samExclusions: SamExclusion[];
  /** Federal court cases mentioning this officer */
  courtCases: CourtCase[];
  /** Bankruptcy filings mentioning this officer */
  bankruptcyCases: BankruptcyCase[];
};

export type SearchLink = {
  label: string;
  url: string;
  category: "social" | "business" | "registry" | "search";
};

export type DigitalFootprint = {
  websiteDomain: string | null;
  websiteUrl: string | null;
  emailDomain: string | null;
  dnbNumber: string | null;
  dnbUrl: string | null;
  bbbSearchUrl: string | null;
  companySearchLinks: SearchLink[];
  officerSearchLinks: {
    officerName: string;
    links: SearchLink[];
  }[];
  sosDeepLink: string | null;
  uccSearchUrl: string | null;
};

export type AddressIntelligence = {
  isPoBox: boolean;
  isLikelyVirtualOffice: boolean;
  virtualOfficeProvider: string | null;
  isLikelyResidential: boolean;
  googleMapsUrl: string;
  streetViewUrl: string;
  flags: string[];
};

export type OshaViolation = {
  activityNumber: string;
  inspectionDate: string;
  establishment: string;
  city: string;
  state: string;
  violationType: string;
  penalty: number;
  description: string;
  status: string;
};

export type EpaEnforcement = {
  facilityName: string;
  registryId: string;
  city: string;
  state: string;
  programAreas: string[];
  violationStatus: string;
  lastInspectionDate: string;
  penalties: number;
  url: string;
};

export type BankruptcyCase = {
  caseName: string;
  court: string;
  chapter: string;
  docketNumber: string;
  dateFiled: string;
  status: string;
  url: string;
};

export type AiGated = { skipped: true; reason: "not_authenticated" | "no_credits" };

/* ── Carrier Intelligence Types ────────────────────────────── */

export type ViolationSummary = {
  code: string;
  description: string;
  group: string;
  count: number;
  oosCount: number;
  percentOfAllViolations: number;
  trend: "INCREASING" | "STABLE" | "DECREASING";
  fixAction: string;
  estimatedCostPerOOS: number;
};

export type VehicleRisk = {
  vin: string;
  inspections: number;
  violations: number;
  oosEvents: number;
  topViolation: string | null;
  riskRank: number;
  recommendation: string;
  otherCarriers: { dotNumber: number; legalName: string | null; statusCode: string | null }[];
};

export type DriverRisk = {
  cdlKey: string;
  inspections: number;
  violations: number;
  oosEvents: number;
  topViolation: string | null;
  riskRank: number;
  recommendation: string;
};

export type FleetVulnerabilityReport = {
  dotNumber: number;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  cleanRate: number;
  vehicleOOSRate: number;
  driverOOSRate: number;
  topViolations: ViolationSummary[];
  vehicleRisk: VehicleRisk[];
  driverRisk: DriverRisk[];
  projectedSavings: {
    ifTopViolationFixed: number;
    ifTop3Fixed: number;
    methodology: string;
  };
};

export type CostImpactReport = {
  dotNumber: number;
  period: { start: string; end: string };
  inputs: { avgTowCost: number; avgRepairCost: number; avgDelayHours: number; revenuePerMile: number; avgDailyMiles: number };
  dailyRevenuePerTruck: number;
  annualOOSEvents: number;
  annualDirectCost: number;
  annualRevenueLost: number;
  estimatedInsurancePremiumIncrease: number;
  totalAnnualImpact: number;
  projectedOOSEventsIfFixed: number;
  projectedAnnualSavings: number;
  projectedInsuranceSavings: number;
  totalProjectedSavings: number;
  topCostlyViolations: { code: string; description: string; oosCount: number; estimatedDirectCost: number; estimatedRevenueLost: number; estimatedTotal: number }[];
  topActions: { action: string; eliminates: number; savings: number }[];
};

export type PreTripFocusSheet = {
  vin: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  currentCleanRate: number;
  projectedCleanRate: number;
  focusItems: {
    rank: number;
    code: string;
    description: string;
    group: string;
    count: number;
    oosCount: number;
    checkItem: string;
    fixAction: string;
    lastViolationDate: string | null;
    lastViolationLocation: string | null;
  }[];
};

export type DriverScorecardData = {
  cdlKey: string;
  dotNumber: number | null;
  period: { start: string; end: string };
  totalInspections: number;
  cleanInspections: number;
  cleanRate: number;
  driverOOSEvents: number;
  vehicleOOSEvents: number;
  topDriverViolations: { code: string; description: string; count: number; group: string }[];
  topVehicleViolations: { code: string; description: string; count: number; group: string }[];
  companyAvgCleanRate: number | null;
  performanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
  trainingRecommendations: string[];
  estimatedRiskReduction: string;
};

export type HeatmapData = {
  period: { start: string; end: string };
  facilities: {
    state: string;
    facility: string;
    totalInspections: number;
    oosInspections: number;
    oosRate: number;
    mostCommonGroup: string;
    topViolationCodes: { code: string; count: number }[];
  }[];
  stateStats: { state: string; totalInspections: number; oosRate: number }[];
  nationalAvgOosRate: number;
};

export type EnablerRiskInfo = {
  id: string;
  name: string;
  type: string;
  relationship: string;
  riskScore: number;
  riskTier: string | null;
  isCurrent: boolean;
};

export type CarrierEnablersData = {
  enablers: EnablerRiskInfo[];
  warnings: string[];
};

export type BackgroundData = {
  officerProfiles: OfficerProfile[];
  officerCrossRefs: OfficerCrossRef[];
  mailingAddressMatches: { dotNumber: string; legalName: string; statusCode?: string }[];
  ofacMatches: OfacMatch[];
  samExclusions: SamExclusion[];
  edgarFilings: EdgarFiling[];
  courtCases: CourtCase[];
  corporateAffiliations: OcOfficerCompany[];
  digitalFootprint: DigitalFootprint | null;
  addressIntelligence: AddressIntelligence | null;
  oshaViolations: OshaViolation[];
  epaEnforcements: EpaEnforcement[];
  bankruptcyCases: BankruptcyCase[];
  corporateNetwork: CorporateNetwork | null;
  riskNarrative: string | null;
  aiGated?: AiGated;
  errors: string[];
};

export type AnomalyFlag = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  detail: string;
};

export type DetectionData = {
  anomalyFlags: AnomalyFlag[];
  authorityMill: {
    grantCount: number;
    revokeCount: number;
    avgDaysBetween: number;
    isMillPattern: boolean;
  };
  brokerReincarnation: {
    priorDot: number | null;
    addressMatch: boolean;
    phoneMatch: boolean;
    officerMatch: boolean;
    isReincarnation: boolean;
  };
  sharedInsurance: {
    policyNumber: string;
    insurerName: string;
    matchingDots: number[];
    matchingCarriers?: { dotNumber: string; legalName: string; statusCode?: string }[];
  }[];
  addressMatches?: { dotNumber: string; legalName: string; statusCode?: string }[];
  aiExplanation?: string | null;
  aiGated?: AiGated;
};
