import { describe, it, expect } from "vitest";
import {
  toDatedInspections,
  toDatedCrashes,
  toInsurancePolicies,
  oosRates,
  recentFatalCrash,
  authorityInstability,
  buildIntelligence,
} from "./adapters";

describe("toDatedInspections", () => {
  it("maps date, OOS flag (oos_total>0), and violation count", () => {
    const out = toDatedInspections([
      { dot_number: "1", insp_date: "2025-01-01", oos_total: "2", viol_total: "5" },
      { dot_number: "1", insp_date: "2025-02-01", oos_total: "0", viol_total: "1" },
    ]);
    expect(out).toEqual([
      { date: "2025-01-01", oos: true, violations: 5 },
      { date: "2025-02-01", oos: false, violations: 1 },
    ]);
  });

  it("skips inspections without a date", () => {
    const out = toDatedInspections([
      { dot_number: "1", oos_total: "1", viol_total: "1" },
      { dot_number: "1", insp_date: "2025-02-01", oos_total: "0", viol_total: "0" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBe("2025-02-01");
  });
});

describe("toDatedCrashes", () => {
  it("maps report_date and skips dateless rows", () => {
    const out = toDatedCrashes([
      { dot_number: "1", report_date: "2025-03-01" },
      { dot_number: "1" },
    ]);
    expect(out).toEqual([{ date: "2025-03-01" }]);
  });
});

describe("toInsurancePolicies", () => {
  it("maps insurer name and effective date", () => {
    const out = toInsurancePolicies([
      { dot_number: "1", name_company: "ACME INS", effective_date: "2024-01-01" },
    ]);
    expect(out[0].insurer).toBe("ACME INS");
    expect(out[0].from).toBe("2024-01-01");
  });
});

describe("oosRates", () => {
  it("returns nulls when there are no inspections", () => {
    expect(oosRates([])).toEqual({ vehicleOosRate: null, driverOosRate: null });
  });

  it("computes percent of inspections with a vehicle/driver OOS", () => {
    const rows: any[] = [
      { dot_number: "1", vehicle_oos_total: "1", driver_oos_total: "0" },
      { dot_number: "1", vehicle_oos_total: "0", driver_oos_total: "0" },
      { dot_number: "1", vehicle_oos_total: "0", driver_oos_total: "1" },
      { dot_number: "1", vehicle_oos_total: "0", driver_oos_total: "0" },
    ];
    const r = oosRates(rows);
    expect(r.vehicleOosRate).toBeCloseTo(25); // 1 of 4
    expect(r.driverOosRate).toBeCloseTo(25); // 1 of 4
  });
});

describe("recentFatalCrash", () => {
  const asOf = "2026-06-01";
  it("is true when a fatal crash occurred within 24 months", () => {
    expect(recentFatalCrash([{ dot_number: "1", report_date: "2025-06-01", fatalities: "1" }], asOf)).toBe(true);
  });
  it("is false when the only fatal crash is older than 24 months", () => {
    expect(recentFatalCrash([{ dot_number: "1", report_date: "2023-01-01", fatalities: "2" }], asOf)).toBe(false);
  });
  it("is false when there are crashes but no fatalities", () => {
    expect(recentFatalCrash([{ dot_number: "1", report_date: "2026-05-01", fatalities: "0", injuries: "3" }], asOf)).toBe(false);
  });
});

describe("authorityInstability", () => {
  it("is false with no authority history", () => {
    expect(authorityInstability([])).toBe(false);
  });
  it("is true on a revoked disposition", () => {
    expect(authorityInstability([{ dot_number: "1", original_action_desc: "GRANTED", disp_action_desc: "REVOKED" }])).toBe(true);
  });
  it("is true on a suspended disposition", () => {
    expect(authorityInstability([{ dot_number: "1", disp_action_desc: "SUSPENDED" }])).toBe(true);
  });
  it("is true when authority was granted more than once (reincarnation signal)", () => {
    expect(
      authorityInstability([
        { dot_number: "1", original_action_desc: "GRANTED" },
        { dot_number: "1", original_action_desc: "GRANTED" },
      ])
    ).toBe(true);
  });
  it("is false for a single clean grant", () => {
    expect(authorityInstability([{ dot_number: "1", original_action_desc: "GRANTED" }])).toBe(false);
  });
});

describe("buildIntelligence", () => {
  const asOf = "2026-06-01";
  it("composes all four modules and never throws on empty input", () => {
    const intel = buildIntelligence({ inspections: [], crashes: [], insurance: [], basics: [], authorityHistory: [], vins: [], drivers: [], powerUnits: null, asOf });
    expect(intel.trajectory.verdict).toBe("insufficient_data");
    expect(intel.anomaly.anomalies).toEqual([]);
    expect(intel.benchmark.mode).toBe("national");
    expect(intel.outlook.band).toBe("stable");
    expect(intel.churn.hasData).toBe(false);
  });

  it("feeds derived signals into the outlook", () => {
    const intel = buildIntelligence({
      inspections: [
        { dot_number: "1", insp_date: "2024-01-01", oos_total: "0", viol_total: "0" },
        { dot_number: "1", insp_date: "2024-06-01", oos_total: "0", viol_total: "0" },
        { dot_number: "1", insp_date: "2025-01-01", oos_total: "1", viol_total: "1" },
        { dot_number: "1", insp_date: "2025-06-01", oos_total: "1", viol_total: "1" }, // 2025 OOS rate jumps
      ],
      crashes: [{ dot_number: "1", report_date: "2025-12-01", fatalities: "1" }],
      insurance: [],
      basics: [{ name: "Unsafe Driving", percentile: 95, totalViolations: 0, totalInspections: 0, serious: 0, measureValue: 0, rdDeficient: true, code: "" }],
      authorityHistory: [{ dot_number: "1", original_action_desc: "GRANTED", disp_action_desc: "REVOKED" }],
      vins: [],
      drivers: [],
      powerUnits: 3,
      asOf,
    });
    expect(intel.trajectory.verdict).toBe("deteriorating");
    expect(intel.outlook.score).toBeGreaterThan(0);
    expect(intel.outlook.factors.some((f) => f.label === "recent_fatal_crash")).toBe(true);
    expect(intel.outlook.factors.some((f) => f.label === "basic_percentile_critical")).toBe(true);
    expect(intel.outlook.factors.some((f) => f.label === "authority_instability")).toBe(true);
  });
});
