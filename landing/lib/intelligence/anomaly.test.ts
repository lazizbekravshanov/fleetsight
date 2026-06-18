import { describe, it, expect } from "vitest";
import { detectAnomalies } from "./anomaly";

const asOf = "2026-06-01";

describe("detectAnomalies", () => {
  it("returns no anomalies for an empty carrier", () => {
    const r = detectAnomalies({ powerUnits: null, inspections: [], insurancePolicies: [], asOf });
    expect(r.inspectionsLast12mo).toBe(0);
    expect(r.daysSinceLastInspection).toBeNull();
    expect(r.fleetActivityFlag).toBe(false);
    expect(r.droughtFlag).toBe(false);
    expect(r.insurerCount).toBe(0);
    expect(r.insurerChanges).toBe(0);
    expect(r.lapseCount).toBe(0);
    expect(r.insurerChurnFlag).toBe(false);
    expect(r.anomalies).toEqual([]);
  });

  it("counts only inspections within the last 12 months", () => {
    const r = detectAnomalies({
      powerUnits: 1,
      inspections: [{ date: "2026-05-01" }, { date: "2025-12-15" }, { date: "2024-01-01" }],
      insurancePolicies: [],
      asOf,
    });
    expect(r.inspectionsLast12mo).toBe(2); // 2024-01-01 is outside 365d
  });

  it("flags a sizable fleet with no inspections in the last year", () => {
    const r = detectAnomalies({
      powerUnits: 10,
      inspections: [{ date: "2024-01-01" }],
      insurancePolicies: [],
      asOf,
    });
    expect(r.inspectionsLast12mo).toBe(0);
    expect(r.fleetActivityFlag).toBe(true);
    expect(r.anomalies).toContain("fleet_activity_mismatch");
  });

  it("does not flag a small fleet with no inspections", () => {
    const r = detectAnomalies({ powerUnits: 2, inspections: [], insurancePolicies: [], asOf });
    expect(r.fleetActivityFlag).toBe(false);
  });

  it("flags an inspection drought for a sizable fleet", () => {
    const drought = detectAnomalies({ powerUnits: 8, inspections: [{ date: "2024-01-01" }], insurancePolicies: [], asOf });
    expect(drought.droughtFlag).toBe(true);
    const recent = detectAnomalies({ powerUnits: 8, inspections: [{ date: "2026-05-01" }], insurancePolicies: [], asOf });
    expect(recent.droughtFlag).toBe(false);
  });

  it("counts distinct insurers and insurer changes", () => {
    const r = detectAnomalies({
      powerUnits: 1,
      inspections: [],
      insurancePolicies: [
        { insurer: "A", from: "2022-01-01", to: "2023-01-01" },
        { insurer: "A", from: "2023-01-01", to: "2024-01-01" },
        { insurer: "B", from: "2024-01-01", to: "2025-01-01" },
        { insurer: "C", from: "2025-01-01", to: null },
      ],
      asOf,
    });
    expect(r.insurerCount).toBe(3); // A, B, C
    expect(r.insurerChanges).toBe(2); // distinct - 1
    expect(r.lapseCount).toBe(0); // continuous coverage
  });

  it("detects coverage lapses between consecutive policies", () => {
    const r = detectAnomalies({
      powerUnits: 1,
      inspections: [],
      insurancePolicies: [
        { insurer: "A", from: "2024-01-01", to: "2025-01-01" },
        { insurer: "B", from: "2025-03-01", to: null }, // 59-day gap
      ],
      asOf,
    });
    expect(r.lapseCount).toBe(1);
    expect(r.insurerChurnFlag).toBe(true); // a lapse alone trips churn
    expect(r.anomalies).toContain("insurer_churn");
  });

  it("trips insurer churn at 3+ insurer changes", () => {
    const r = detectAnomalies({
      powerUnits: 1,
      inspections: [],
      insurancePolicies: [
        { insurer: "A", from: "2022-01-01", to: "2023-01-01" },
        { insurer: "B", from: "2023-01-01", to: "2024-01-01" },
        { insurer: "C", from: "2024-01-01", to: "2025-01-01" },
        { insurer: "D", from: "2025-01-01", to: null },
      ],
      asOf,
    });
    expect(r.insurerChanges).toBe(3);
    expect(r.insurerChurnFlag).toBe(true);
  });
});
