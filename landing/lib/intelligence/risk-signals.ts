/**
 * Risk Signal Detection Engine — 25 automated signals
 */

import type { SocrataInspection, SocrataCrash, SocrataInsurance, SocrataAuthorityHistory, SocrataCarrier } from "@/lib/socrata";
import type { IntelBasicScore } from "./trust-score";

export type RiskSignalSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export type RiskSignal = {
  signalType: string;
  severity: RiskSignalSeverity;
  category: "authority" | "safety" | "fraud" | "insurance" | "operational";
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
};

type SignalInput = {
  carrier: SocrataCarrier;
  basicScores: IntelBasicScore[];
  inspections: SocrataInspection[];
  crashes: SocrataCrash[];
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  isVoip?: boolean;
  sosMatchQuality?: "exact" | "partial" | "none";
  sharedAddressCount?: number;
  sharedVinCount?: number;
};

function detectAuthoritySignals(input: SignalInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const c = input.carrier;

  if (c.add_date) {
    const days = (Date.now() - new Date(c.add_date).getTime()) / (86400000);
    if (days < 90) signals.push({ signalType: "NEW_AUTHORITY_UNDER_90_DAYS", severity: "MEDIUM", category: "authority", title: "New authority — less than 90 days", description: `Authority granted ${Math.round(days)} days ago.`, evidence: { daysOld: Math.round(days) } });
  }

  if (c.mcs150_date) {
    const months = (Date.now() - new Date(c.mcs150_date).getTime()) / (2629746000);
    if (months > 24) signals.push({ signalType: "MCS150_STALE", severity: months > 36 ? "HIGH" : "MEDIUM", category: "authority", title: "MCS-150 overdue", description: `Last updated ${Math.round(months)} months ago.`, evidence: { monthsStale: Math.round(months) } });
  } else {
    signals.push({ signalType: "MCS150_MISSING", severity: "HIGH", category: "authority", title: "No MCS-150 filing date", description: "No MCS-150 filing date in FMCSA records." });
  }

  if (c.status_code && c.status_code !== "A") signals.push({ signalType: "INACTIVE_STATUS", severity: "CRITICAL", category: "authority", title: "Carrier not active", description: `Status is "${c.status_code}".`, evidence: { statusCode: c.status_code } });

  const revocations = input.authorityHistory.filter((h) => (h.disp_action_desc ?? "").toUpperCase().includes("REVOK"));
  if (revocations.length > 0) signals.push({ signalType: "AUTHORITY_REVOCATION_HISTORY", severity: revocations.length >= 2 ? "HIGH" : "MEDIUM", category: "authority", title: `${revocations.length} prior revocation${revocations.length > 1 ? "s" : ""}`, description: `Authority revoked ${revocations.length} time${revocations.length > 1 ? "s" : ""}.` });

  if (c.status_code === "A" && parseInt(c.power_units ?? "0", 10) === 0) signals.push({ signalType: "ZERO_POWER_UNITS_ACTIVE", severity: "HIGH", category: "authority", title: "Active with zero power units", description: "Active status but reports zero power units." });

  return signals;
}

function detectSafetySignals(input: SignalInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const names: Record<number, string> = { 1: "Unsafe Driving", 2: "HOS Compliance", 3: "Driver Fitness", 4: "Controlled Substances", 5: "Vehicle Maintenance", 6: "Hazmat", 7: "Crash Indicator" };

  for (const b of input.basicScores) {
    if (b.percentile > 75) {
      const n = names[b.basicsId] ?? b.basicsDescription;
      signals.push({ signalType: `BASIC_${n.toUpperCase().replace(/[\s-]/g, "_")}_ALERT`, severity: b.percentile > 90 ? "CRITICAL" : "HIGH", category: "safety", title: `${n} — ${b.percentile}th pctile`, description: `Above 75th percentile intervention threshold.`, evidence: { percentile: b.percentile } });
    }
  }

  const inspCount = input.inspections.length;
  if (inspCount >= 5) {
    const oosCount = input.inspections.filter((i) => parseInt(i.oos_total ?? "0", 10) > 0).length;
    const rate = (oosCount / inspCount) * 100;
    if (rate > 20) signals.push({ signalType: "OOS_RATE_CRITICAL", severity: "CRITICAL", category: "safety", title: `OOS rate ${rate.toFixed(1)}%`, description: `${oosCount} of ${inspCount} inspections resulted in OOS.`, evidence: { oosRate: rate } });
    else if (rate > 10) signals.push({ signalType: "OOS_RATE_ELEVATED", severity: "HIGH", category: "safety", title: `OOS rate ${rate.toFixed(1)}%`, description: "Above national average.", evidence: { oosRate: rate } });
  }

  const cutoff24m = Date.now() - 63113904000;
  const recentFatal = input.crashes.filter((c) => (c.report_date ? new Date(c.report_date).getTime() : 0) > cutoff24m && parseInt(c.fatalities ?? "0", 10) > 0);
  if (recentFatal.length > 0) signals.push({ signalType: "FATAL_CRASH_RECENT", severity: "CRITICAL", category: "safety", title: `${recentFatal.length} fatal crash${recentFatal.length > 1 ? "es" : ""} in 24mo`, description: `Fatal crash${recentFatal.length > 1 ? "es" : ""} within the past 24 months.` });

  const cutoff6m = Date.now() - 15778476000;
  const recent6m = input.crashes.filter((c) => (c.report_date ? new Date(c.report_date).getTime() : 0) > cutoff6m);
  if (recent6m.length >= 3) signals.push({ signalType: "MULTIPLE_CRASHES_SHORT_PERIOD", severity: "HIGH", category: "safety", title: `${recent6m.length} crashes in 6 months`, description: "Elevated crash frequency." });

  if (inspCount === 0 && input.carrier.add_date) {
    const months = (Date.now() - new Date(input.carrier.add_date).getTime()) / 2629746000;
    if (months > 12 && input.carrier.status_code === "A") signals.push({ signalType: "NO_INSPECTIONS_ACTIVE_AUTHORITY", severity: "MEDIUM", category: "safety", title: "No inspections despite active authority", description: `Active for ${Math.round(months)} months with zero inspections.` });
  }

  return signals;
}

function detectFraudSignals(input: SignalInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const c = input.carrier;

  if (input.isVoip) signals.push({ signalType: "VOIP_PHONE_DETECTED", severity: "LOW", category: "fraud", title: "VoIP phone number", description: "Primary phone is VoIP — more common in fraud." });
  if (input.sosMatchQuality === "none") signals.push({ signalType: "NO_SOS_REGISTRATION", severity: "MEDIUM", category: "fraud", title: "No SoS registration found", description: "No matching business registration." });
  if (input.sharedAddressCount && input.sharedAddressCount >= 3) signals.push({ signalType: "SHARED_ADDRESS_CLUSTER", severity: input.sharedAddressCount >= 5 ? "HIGH" : "MEDIUM", category: "fraud", title: `Address shared with ${input.sharedAddressCount} carriers`, description: "May indicate virtual office or chameleon network.", evidence: { count: input.sharedAddressCount } });
  if (input.sharedVinCount && input.sharedVinCount >= 1) signals.push({ signalType: "SHARED_VIN_ACTIVE", severity: "HIGH", category: "fraud", title: `${input.sharedVinCount} shared VIN${input.sharedVinCount > 1 ? "s" : ""}`, description: "Equipment registered to multiple carriers.", evidence: { count: input.sharedVinCount } });

  const units = parseInt(c.power_units ?? "0", 10);
  const drivers = parseInt(c.total_drivers ?? "0", 10);
  if (units === 0 && drivers === 0 && c.add_date) {
    const days = (Date.now() - new Date(c.add_date).getTime()) / 86400000;
    if (days < 180) signals.push({ signalType: "SHELL_CARRIER_PATTERN", severity: "HIGH", category: "fraud", title: "Possible shell carrier", description: `New authority (${Math.round(days)}d) with zero units and drivers.` });
  }

  if (units > 5 && drivers > 0 && drivers / units > 3) signals.push({ signalType: "DRIVER_RATIO_HIGH", severity: "LOW", category: "fraud", title: `Driver ratio ${(drivers / units).toFixed(1)}:1`, description: "Unusually high driver-to-unit ratio." });

  return signals;
}

function detectInsuranceSignals(input: SignalInput): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const bipd = input.insurance.filter((i) => (i.mod_col_1 ?? "").toUpperCase().includes("BIPD"));
  const isHaz = input.carrier.hm_ind === "Y";

  if (bipd.length === 0) { signals.push({ signalType: "NO_BIPD_INSURANCE", severity: "CRITICAL", category: "insurance", title: "No BIPD insurance", description: "No liability insurance on file." }); }
  else {
    const minReq = isHaz ? 5000000 : 750000;
    const maxCov = Math.max(...bipd.map((i) => parseInt(i.max_cov_amount ?? "0", 10) || 0));
    if (maxCov > 0 && maxCov < minReq) signals.push({ signalType: "INSURANCE_BELOW_MINIMUM", severity: "HIGH", category: "insurance", title: "Insurance below minimum", description: `Coverage $${maxCov.toLocaleString()} vs required $${minReq.toLocaleString()}.` });
    if (maxCov === 750000 && !isHaz) signals.push({ signalType: "INSURANCE_MINIMUM_ONLY", severity: "LOW", category: "insurance", title: "Insurance at exact minimum", description: "$750K BIPD with no excess." });
  }

  if (input.insurance.length > 6) signals.push({ signalType: "INSURANCE_FREQUENT_CHANGES", severity: "MEDIUM", category: "insurance", title: `${input.insurance.length} policy records`, description: "Frequent insurance changes may indicate instability." });

  return signals;
}

export function detectRiskSignals(input: SignalInput): RiskSignal[] {
  return [
    ...detectAuthoritySignals(input),
    ...detectSafetySignals(input),
    ...detectFraudSignals(input),
    ...detectInsuranceSignals(input),
  ].sort((a, b) => {
    const order: Record<RiskSignalSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    return order[a.severity] - order[b.severity];
  });
}
