import { describe, it, expect } from "vitest";
import { computeTrajectory } from "./trajectory";

describe("computeTrajectory", () => {
  const asOf = "2026-06-01";

  it("returns insufficient_data when there is no history", () => {
    const t = computeTrajectory({ inspections: [], crashes: [], asOf });
    expect(t.verdict).toBe("insufficient_data");
    expect(t.byYear).toEqual([]);
    expect(t.oosRateDelta).toBeNull();
    expect(t.daysSinceLastInspection).toBeNull();
    expect(t.daysSinceLastCrash).toBeNull();
    expect(t.avgInspectionGapDays).toBeNull();
  });

  it("groups inspections by year with OOS rate and violations per inspection", () => {
    const t = computeTrajectory({
      inspections: [
        { date: "2024-02-10", oos: true, violations: 3 },
        { date: "2024-08-01", oos: false, violations: 1 },
        { date: "2025-03-05", oos: false, violations: 0 },
        { date: "2025-09-09", oos: false, violations: 2 },
      ],
      crashes: [],
      asOf,
    });
    const y2024 = t.byYear.find((y) => y.year === 2024)!;
    const y2025 = t.byYear.find((y) => y.year === 2025)!;
    expect(y2024.inspections).toBe(2);
    expect(y2024.oosRate).toBeCloseTo(50); // 1 of 2
    expect(y2024.violationsPerInspection).toBeCloseTo(2); // (3+1)/2
    expect(y2025.oosRate).toBeCloseTo(0);
    expect(y2025.violationsPerInspection).toBeCloseTo(1); // (0+2)/2
  });

  it("computes oosRateDelta as latest year minus prior year and flags deteriorating", () => {
    const t = computeTrajectory({
      inspections: [
        { date: "2024-01-01", oos: false, violations: 0 },
        { date: "2024-06-01", oos: false, violations: 0 }, // 2024: 0%
        { date: "2025-01-01", oos: true, violations: 0 },
        { date: "2025-06-01", oos: false, violations: 0 }, // 2025: 50%
      ],
      crashes: [],
      asOf,
    });
    expect(t.oosRateDelta).toBeCloseTo(50);
    expect(t.verdict).toBe("deteriorating");
  });

  it("flags improving when OOS rate falls year over year", () => {
    const t = computeTrajectory({
      inspections: [
        { date: "2024-01-01", oos: true, violations: 0 },
        { date: "2024-06-01", oos: true, violations: 0 }, // 2024: 100%
        { date: "2025-01-01", oos: false, violations: 0 },
        { date: "2025-06-01", oos: false, violations: 0 }, // 2025: 0%
      ],
      crashes: [],
      asOf,
    });
    expect(t.oosRateDelta).toBeCloseTo(-100);
    expect(t.verdict).toBe("improving");
  });

  it("is stable when OOS rate barely changes year over year", () => {
    const t = computeTrajectory({
      inspections: [
        { date: "2024-01-01", oos: false, violations: 0 },
        { date: "2024-02-01", oos: false, violations: 0 },
        { date: "2024-03-01", oos: false, violations: 0 },
        { date: "2024-04-01", oos: true, violations: 0 }, // 2024: 25%
        { date: "2025-01-01", oos: false, violations: 0 },
        { date: "2025-02-01", oos: false, violations: 0 },
        { date: "2025-03-01", oos: false, violations: 0 },
        { date: "2025-04-01", oos: true, violations: 0 }, // 2025: 25%
      ],
      crashes: [],
      asOf,
    });
    expect(t.oosRateDelta).toBeCloseTo(0);
    expect(t.verdict).toBe("stable");
  });

  it("computes days since last inspection and crash from asOf", () => {
    const t = computeTrajectory({
      inspections: [{ date: "2026-05-02", oos: false, violations: 0 }],
      crashes: [{ date: "2026-04-02" }],
      asOf: "2026-06-01",
    });
    expect(t.daysSinceLastInspection).toBe(30); // May 2 -> Jun 1
    expect(t.daysSinceLastCrash).toBe(60); // Apr 2 -> Jun 1
  });

  it("computes average gap between consecutive inspections in days", () => {
    const t = computeTrajectory({
      inspections: [
        { date: "2025-01-01", oos: false, violations: 0 },
        { date: "2025-01-11", oos: false, violations: 0 }, // +10
        { date: "2025-01-31", oos: false, violations: 0 }, // +20
      ],
      crashes: [],
      asOf,
    });
    expect(t.avgInspectionGapDays).toBeCloseTo(15); // (10+20)/2
  });
});
