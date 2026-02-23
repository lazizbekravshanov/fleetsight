import type { SocrataCarrier, SocrataInspection, SocrataCrash, SocrataInsurance, SocrataViolation, SocrataAuthorityHistory, SocrataComplaint } from "@/lib/socrata";

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

export type FleetData = {
  units: SocrataFleetUnit[];
  decodedVehicles: NhtsaDecodedVin[];
  recalls: NhtsaRecall[];
};

export type SocrataFleetUnit = {
  dot_number: string;
  vin?: string;
  unit_type?: string;
  unit_make?: string;
  unit_year?: string;
  unit_type_desc?: string;
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
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  basics: unknown;
  authority: unknown;
  oos: unknown;
  insurance: SocrataInsurance[];
  violations: SocrataViolation[];
  authorityHistory: SocrataAuthorityHistory[];
  complaints: SocrataComplaint[];
  peerBenchmark: PeerBenchmark | null;
};

export type Tab = "overview" | "safety" | "inspections" | "crashes" | "insurance" | "fleet";
