export type TMSProvider = "turvo" | "mcleod" | "tai" | "trimble" | "custom";

export type ScreeningResult = {
  dotNumber: string;
  legalName: string;
  approved: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  trustGrade: string | null;
  trustScore: number | null;
  compositeRisk: number | null;
  flags: string[];
  checkedAt: string;
};

export type TMSScreenRequest = {
  dotNumber: string;
  loadId?: string;
  callbackUrl?: string;
};

export type TMSWebhookPayload = {
  provider: TMSProvider;
  event: "load_created" | "carrier_assigned" | "load_tendered";
  data: {
    loadId: string;
    carrierDotNumber?: string;
    carrierName?: string;
  };
  timestamp: string;
};
