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

export type CarrierDetail = {
  carrier: SocrataCarrier;
  basics: unknown;
  authority: unknown;
  oos: unknown;
  peerBenchmark: PeerBenchmark | null;
  safetyRating?: string | null;
  safetyRatingDate?: string | null;
  smartwayPartner?: boolean;
  inspectionCount?: number;
  crashCount?: number;
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

export type Tab = "overview" | "safety" | "inspections" | "crashes" | "insurance" | "fleet" | "detection";

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
};
