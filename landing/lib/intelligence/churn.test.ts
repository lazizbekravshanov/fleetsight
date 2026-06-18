import { describe, it, expect } from "vitest";
import { computeChurn } from "./churn";

const asOf = "2026-06-01";

describe("computeChurn", () => {
  it("reports hasData=false and zeros for a carrier with no fleet history", () => {
    const r = computeChurn({ vins: [], drivers: [], asOf });
    expect(r.hasData).toBe(false);
    expect(r.vinsTotal).toBe(0);
    expect(r.vinChurnRate).toBe(0);
    expect(r.driversTotal).toBe(0);
    expect(r.driverChurnRate).toBe(0);
  });

  it("counts a VIN as churned when last seen more than 12 months ago", () => {
    const r = computeChurn({
      vins: [
        { vin: "A", lastSeenAt: "2026-05-01" }, // active
        { vin: "B", lastSeenAt: "2026-04-01" }, // active
        { vin: "C", lastSeenAt: "2026-03-01" }, // active
        { vin: "D", lastSeenAt: "2024-01-01" }, // churned (>365d)
      ],
      drivers: [],
      asOf,
    });
    expect(r.vinsTotal).toBe(4);
    expect(r.vinsChurned).toBe(1);
    expect(r.vinChurnRate).toBeCloseTo(25);
    expect(r.hasData).toBe(true);
  });

  it("collapses duplicate VINs to the most recent sighting", () => {
    const r = computeChurn({
      vins: [
        { vin: "A", lastSeenAt: "2024-01-01" },
        { vin: "A", lastSeenAt: "2026-05-01" }, // most recent wins -> active
      ],
      drivers: [],
      asOf,
    });
    expect(r.vinsTotal).toBe(1);
    expect(r.vinsChurned).toBe(0);
  });

  it("computes driver churn from the most recent inspection per CDL", () => {
    const r = computeChurn({
      vins: [],
      drivers: [
        { cdlKey: "X", inspectionDate: "2026-05-01" }, // active
        { cdlKey: "X", inspectionDate: "2023-01-01" }, // older sighting of same driver
        { cdlKey: "Y", inspectionDate: "2024-01-01" }, // churned
      ],
      asOf,
    });
    expect(r.driversTotal).toBe(2); // distinct CDLs
    expect(r.driversChurned).toBe(1); // Y only
    expect(r.driverChurnRate).toBeCloseTo(50);
  });
});
