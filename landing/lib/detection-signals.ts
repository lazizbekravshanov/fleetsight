import type { SocrataCarrier, SocrataInsurance, SocrataAuthorityHistory } from "./socrata";

// ── Types ────────────────────────────────────────────────────────

export type AnomalyFlag = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  detail: string;
};

export type InsuranceCrossMatch = {
  policyNumber: string;
  insurerName: string;
  matchingDots: number[];
};

export type AuthorityMillSignal = {
  grantCount: number;
  revokeCount: number;
  avgDaysBetween: number;
  isMillPattern: boolean;
};

export type BrokerReincarnationSignal = {
  priorDot: number | null;
  addressMatch: boolean;
  phoneMatch: boolean;
  officerMatch: boolean;
  isReincarnation: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2)) return Infinity;
  return Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
}

function normalizeAddress(street: string | undefined | null): string {
  if (!street) return "";
  return street
    .toUpperCase()
    .replace(/[.,#]/g, "")
    .replace(/\bSUITE\b/g, "STE")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "").slice(-10);
}

function normalizeOfficer(name: string | undefined | null): string {
  if (!name) return "";
  return name.toUpperCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

// ── Shell Carrier / Power Unit Anomalies ─────────────────────────

export function detectShellCarrier(carrier: SocrataCarrier): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const isActive = carrier.status_code === "A";
  const powerUnits = parseInt(carrier.power_units ?? "0", 10) || 0;
  const totalDrivers = parseInt(carrier.total_drivers ?? "0", 10) || 0;

  if (isActive && powerUnits === 0 && totalDrivers === 0) {
    flags.push({
      id: "SHELL_CARRIER",
      severity: "critical",
      label: "Shell Carrier",
      detail: "Active carrier with 0 power units and 0 drivers — possible shell entity.",
    });
  }

  if (carrier.mcs150_date) {
    const mcsDate = new Date(carrier.mcs150_date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (mcsDate < twoYearsAgo) {
      flags.push({
        id: "OVERDUE_MCS150",
        severity: "medium",
        label: "Overdue MCS-150",
        detail: `MCS-150 last updated ${mcsDate.toISOString().slice(0, 10)} — over 2 years ago.`,
      });
    }
  }

  if (carrier.add_date) {
    const addDate = new Date(carrier.add_date);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (addDate > sixMonthsAgo && powerUnits > 50) {
      flags.push({
        id: "SUDDEN_FLEET_GROWTH",
        severity: "high",
        label: "Sudden Fleet Growth",
        detail: `DOT registered ${addDate.toISOString().slice(0, 10)} (< 6 months) with ${powerUnits} power units.`,
      });
    }
  }

  if (isActive && powerUnits > 0 && totalDrivers === 0) {
    flags.push({
      id: "ZERO_DRIVERS",
      severity: "high",
      label: "Zero Drivers",
      detail: `Active carrier with ${powerUnits} power units but 0 drivers on file.`,
    });
  }

  return flags;
}

// ── Authority Mill Detection ─────────────────────────────────────

export function detectAuthorityMill(
  authorityHistory: SocrataAuthorityHistory[]
): AuthorityMillSignal {
  let grantCount = 0;
  let revokeCount = 0;
  const cycleDays: number[] = [];

  // Track grant dates per docket for cycle computation
  const grantDates = new Map<string, string>();

  for (const entry of authorityHistory) {
    const action = entry.original_action_desc?.toUpperCase() ?? "";
    const dispAction = entry.disp_action_desc?.toUpperCase() ?? "";
    const docket = entry.docket_number ?? "unknown";

    if (action.includes("GRANT")) {
      grantCount++;
      if (entry.orig_served_date) {
        grantDates.set(docket, entry.orig_served_date);
      }
    }

    if (dispAction.includes("REVOK") || dispAction.includes("SUSPEND")) {
      revokeCount++;
      const grantDate = grantDates.get(docket);
      if (grantDate && entry.disp_served_date) {
        const days = daysBetween(grantDate, entry.disp_served_date);
        if (days < Infinity) cycleDays.push(days);
      }
    }
  }

  const avgDaysBetween =
    cycleDays.length > 0
      ? Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length)
      : 0;

  const isMillPattern =
    revokeCount >= 3 || (revokeCount >= 2 && avgDaysBetween > 0 && avgDaysBetween < 365);

  return { grantCount, revokeCount, avgDaysBetween, isMillPattern };
}

// ── Broker Reincarnation Detection ───────────────────────────────

export function detectBrokerReincarnation(
  carrier: SocrataCarrier,
  priorCarrier: SocrataCarrier | null
): BrokerReincarnationSignal {
  const priorDot = carrier.prior_revoke_dot
    ? parseInt(carrier.prior_revoke_dot, 10) || null
    : null;

  if (carrier.prior_revoke_flag !== "Y" || !priorDot || !priorCarrier) {
    return {
      priorDot,
      addressMatch: false,
      phoneMatch: false,
      officerMatch: false,
      isReincarnation: false,
    };
  }

  const addressMatch =
    normalizeAddress(carrier.phy_street) !== "" &&
    normalizeAddress(carrier.phy_street) === normalizeAddress(priorCarrier.phy_street) &&
    (carrier.phy_city ?? "").toUpperCase() === (priorCarrier.phy_city ?? "").toUpperCase() &&
    (carrier.phy_state ?? "").toUpperCase() === (priorCarrier.phy_state ?? "").toUpperCase();

  const phone1 = normalizePhone(carrier.phone);
  const phone2 = normalizePhone(priorCarrier.phone);
  const phoneMatch = phone1 !== "" && phone1 === phone2;

  const officers = [
    normalizeOfficer(carrier.company_officer_1),
    normalizeOfficer(carrier.company_officer_2),
  ].filter(Boolean);
  const priorOfficers = [
    normalizeOfficer(priorCarrier.company_officer_1),
    normalizeOfficer(priorCarrier.company_officer_2),
  ].filter(Boolean);
  const officerMatch =
    officers.length > 0 &&
    priorOfficers.length > 0 &&
    officers.some((o) => priorOfficers.includes(o));

  const matchCount =
    (addressMatch ? 1 : 0) + (phoneMatch ? 1 : 0) + (officerMatch ? 1 : 0);

  return {
    priorDot,
    addressMatch,
    phoneMatch,
    officerMatch,
    isReincarnation: matchCount >= 2,
  };
}

// ── Insurance Anomaly Detection ──────────────────────────────────

export function detectInsuranceAnomalies(
  insurance: SocrataInsurance[],
  isHazmat: boolean
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // Find BIPD policies
  const bipdPolicies = insurance.filter(
    (p) =>
      p.mod_col_1?.toUpperCase().includes("BIPD") ||
      p.ins_form_code?.toUpperCase().includes("BIPD")
  );

  if (bipdPolicies.length === 0) {
    flags.push({
      id: "NO_BIPD_FILING",
      severity: "high",
      label: "No BIPD Filing",
      detail: "No bodily injury/property damage liability insurance on file.",
    });
  } else {
    // Check coverage amounts
    const minRequired = isHazmat ? 5_000_000 : 750_000;
    const maxCoverage = Math.max(
      ...bipdPolicies.map((p) => parseInt(p.max_cov_amount ?? "0", 10) || 0)
    );
    if (maxCoverage > 0 && maxCoverage < minRequired) {
      flags.push({
        id: "BIPD_BELOW_MINIMUM",
        severity: "high",
        label: "BIPD Below Minimum",
        detail: `Highest BIPD coverage is $${maxCoverage.toLocaleString()} — minimum required is $${minRequired.toLocaleString()}${isHazmat ? " (hazmat)" : ""}.`,
      });
    }
  }

  // Check for stale insurance (all effective dates > 1 year ago)
  if (insurance.length > 0) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const hasRecent = insurance.some((p) => {
      if (!p.effective_date) return false;
      return new Date(p.effective_date) > oneYearAgo;
    });
    if (!hasRecent) {
      flags.push({
        id: "EXPIRED_INSURANCE",
        severity: "medium",
        label: "Expired Insurance",
        detail: "All insurance filings have effective dates over 1 year ago.",
      });
    }
  }

  return flags;
}

// ── Combined Signal Computation ──────────────────────────────────

export function computeAllSignals({
  carrier,
  insurance,
  authorityHistory,
  priorCarrier,
}: {
  carrier: SocrataCarrier;
  insurance: SocrataInsurance[];
  authorityHistory: SocrataAuthorityHistory[];
  priorCarrier: SocrataCarrier | null;
}): {
  anomalyFlags: AnomalyFlag[];
  authorityMill: AuthorityMillSignal;
  brokerReincarnation: BrokerReincarnationSignal;
} {
  const isHazmat = carrier.hm_ind === "Y";

  const shellFlags = detectShellCarrier(carrier);
  const insuranceFlags = detectInsuranceAnomalies(insurance, isHazmat);
  const authorityMill = detectAuthorityMill(authorityHistory);
  const brokerReincarnation = detectBrokerReincarnation(carrier, priorCarrier);

  const anomalyFlags = [...shellFlags, ...insuranceFlags];

  // Add authority mill as an anomaly flag if pattern detected
  if (authorityMill.isMillPattern) {
    anomalyFlags.push({
      id: "AUTHORITY_MILL",
      severity: "critical",
      label: "Authority Mill Pattern",
      detail: `${authorityMill.revokeCount} revocations with avg cycle of ${authorityMill.avgDaysBetween} days.`,
    });
  }

  // Add broker reincarnation as an anomaly flag if detected
  if (brokerReincarnation.isReincarnation) {
    anomalyFlags.push({
      id: "BROKER_REINCARNATION",
      severity: "critical",
      label: "Broker Reincarnation",
      detail: `Matches prior DOT ${brokerReincarnation.priorDot} on ${[
        brokerReincarnation.addressMatch && "address",
        brokerReincarnation.phoneMatch && "phone",
        brokerReincarnation.officerMatch && "officers",
      ]
        .filter(Boolean)
        .join(", ")}.`,
    });
  }

  // Check for no insurance at all
  if (insurance.length === 0) {
    anomalyFlags.push({
      id: "NO_INSURANCE_FILING",
      severity: "high",
      label: "No Insurance Filing",
      detail: "No insurance records found on file with FMCSA.",
    });
  }

  return { anomalyFlags, authorityMill, brokerReincarnation };
}
