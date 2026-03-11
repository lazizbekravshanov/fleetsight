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

export type Tab = "overview" | "safety" | "inspections" | "crashes" | "insurance" | "fleet" | "detection" | "background";

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
