import { describe, it, expect } from "vitest";
import { computeBenchmark, NATIONAL_AVERAGES } from "./benchmarking";

describe("computeBenchmark", () => {
  it("uses national averages by default and reports mode national", () => {
    const b = computeBenchmark({ vehicleOosRate: 10, driverOosRate: 2, crashesPerPowerUnit: 0.01 });
    expect(b.mode).toBe("national");
    const vehicle = b.rows.find((r) => r.metric === "vehicle_oos")!;
    expect(vehicle.national).toBe(NATIONAL_AVERAGES.vehicleOos);
  });

  it("marks a metric better when it is below the national average", () => {
    const b = computeBenchmark({ vehicleOosRate: 10, driverOosRate: null, crashesPerPowerUnit: null });
    const vehicle = b.rows.find((r) => r.metric === "vehicle_oos")!;
    expect(vehicle.better).toBe(true);
    expect(vehicle.value).toBe(10);
  });

  it("marks a metric worse when it is above the national average", () => {
    const b = computeBenchmark({ vehicleOosRate: 40, driverOosRate: null, crashesPerPowerUnit: null });
    const vehicle = b.rows.find((r) => r.metric === "vehicle_oos")!;
    expect(vehicle.better).toBe(false);
  });

  it("omits rows for metrics with no value", () => {
    const b = computeBenchmark({ vehicleOosRate: 10, driverOosRate: null, crashesPerPowerUnit: null });
    expect(b.rows).toHaveLength(1);
    expect(b.rows[0].metric).toBe("vehicle_oos");
  });

  it("counts how many metrics beat the national average", () => {
    const b = computeBenchmark({ vehicleOosRate: 10, driverOosRate: 2, crashesPerPowerUnit: 0.10 });
    // vehicle 10<20.72 better, driver 2<5.51 better, crashes 0.10>0.04 worse
    expect(b.betterThanNationalCount).toBe(2);
  });

  it("carries live cohort context and flips mode to cohort when peers exist", () => {
    const b = computeBenchmark({
      vehicleOosRate: 10,
      driverOosRate: null,
      crashesPerPowerUnit: null,
      cohort: { fleetSizeBand: "6-20", carrierCount: 4210, avgPowerUnits: 11.2, avgDrivers: 9.8, yourPowerUnits: 14, yourDrivers: 12 },
    });
    expect(b.mode).toBe("cohort");
    expect(b.cohort?.carrierCount).toBe(4210);
    expect(b.cohort?.yourPowerUnits).toBe(14);
  });

  it("ignores an empty cohort (no peers) and stays national", () => {
    const b = computeBenchmark({
      vehicleOosRate: 10,
      driverOosRate: null,
      crashesPerPowerUnit: null,
      cohort: { fleetSizeBand: "?", carrierCount: 0, avgPowerUnits: 0, avgDrivers: 0, yourPowerUnits: null, yourDrivers: null },
    });
    expect(b.mode).toBe("national");
    expect(b.cohort).toBeNull();
  });

  it("has a null cohort when none is provided", () => {
    const b = computeBenchmark({ vehicleOosRate: 10, driverOosRate: null, crashesPerPowerUnit: null });
    expect(b.cohort).toBeNull();
  });

  it("builds a state-cohort comparison when state safety data is provided", () => {
    const b = computeBenchmark({
      vehicleOosRate: 10,
      driverOosRate: 8,
      crashesPerPowerUnit: null,
      stateCohort: { state: "CA", vehicleOosRate: 13.1, driverOosRate: 5.5, sampleSize: 1291593 },
    });
    expect(b.stateCohort?.state).toBe("CA");
    expect(b.stateCohort?.sampleSize).toBe(1291593);
    const veh = b.stateCohort?.rows.find((r) => r.metric === "vehicle_oos")!;
    expect(veh.cohortAvg).toBeCloseTo(13.1);
    expect(veh.better).toBe(true); // 10 < 13.1
    const drv = b.stateCohort?.rows.find((r) => r.metric === "driver_oos")!;
    expect(drv.better).toBe(false); // 8 > 5.5
  });

  it("omits state-cohort rows for metrics the carrier lacks", () => {
    const b = computeBenchmark({
      vehicleOosRate: 10,
      driverOosRate: null,
      crashesPerPowerUnit: null,
      stateCohort: { state: "CA", vehicleOosRate: 13.1, driverOosRate: 5.5, sampleSize: 100 },
    });
    expect(b.stateCohort?.rows).toHaveLength(1);
    expect(b.stateCohort?.rows[0].metric).toBe("vehicle_oos");
  });

  it("has a null state cohort when absent or sample is empty", () => {
    expect(computeBenchmark({ vehicleOosRate: 10, driverOosRate: null, crashesPerPowerUnit: null }).stateCohort).toBeNull();
    expect(
      computeBenchmark({ vehicleOosRate: 10, driverOosRate: null, crashesPerPowerUnit: null, stateCohort: { state: "CA", vehicleOosRate: 13, driverOosRate: 5, sampleSize: 0 } }).stateCohort
    ).toBeNull();
  });

  it("computes a signed delta percentage vs national", () => {
    const b = computeBenchmark({
      vehicleOosRate: 10,
      driverOosRate: null,
      crashesPerPowerUnit: null,
      national: { vehicleOos: 20, driverOos: 5, crashesPerPowerUnit: 0.04 },
    });
    const vehicle = b.rows.find((r) => r.metric === "vehicle_oos")!;
    expect(vehicle.deltaPct).toBeCloseTo(-50); // 10 is 50% below 20
  });
});
