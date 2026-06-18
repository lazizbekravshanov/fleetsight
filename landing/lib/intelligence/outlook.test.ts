import { describe, it, expect } from "vitest";
import { computeOutlook } from "./outlook";

const clean = {
  trajectoryVerdict: "improving" as const,
  worstBasicPercentile: 10,
  recentFatalCrash: false,
  insurerChurn: false,
  authorityInstability: false,
  chameleonScore: 0,
};

describe("computeOutlook", () => {
  it("scores a clean, improving carrier as stable (floored at 0)", () => {
    const o = computeOutlook(clean);
    expect(o.score).toBe(0);
    expect(o.band).toBe("stable");
  });

  it("accumulates points from each risk signal", () => {
    const o = computeOutlook({
      trajectoryVerdict: "deteriorating", // +25
      worstBasicPercentile: 95, // +25
      recentFatalCrash: true, // +20
      insurerChurn: true, // +10
      authorityInstability: true, // +15
      chameleonScore: 100, // +20
    });
    expect(o.score).toBe(100); // sum 115 clamped to 100
    expect(o.band).toBe("high");
  });

  it("maps score ranges to bands", () => {
    // only a deteriorating trajectory (+25) -> watch (>=20)
    expect(computeOutlook({ ...clean, trajectoryVerdict: "deteriorating", worstBasicPercentile: 10 }).band).toBe("watch");
    // deteriorating (+25) + basic>=75 (+12) = 37 -> elevated? no, elevated is >=45. 37 is watch.
    // deteriorating (+25) + fatal crash (+20) = 45 -> elevated
    expect(
      computeOutlook({ ...clean, trajectoryVerdict: "deteriorating", recentFatalCrash: true, worstBasicPercentile: 10 }).band
    ).toBe("elevated");
  });

  it("lists only non-zero factors, sorted by magnitude descending", () => {
    const o = computeOutlook({
      trajectoryVerdict: "stable", // 0 -> excluded
      worstBasicPercentile: 95, // +25
      recentFatalCrash: false, // excluded
      insurerChurn: true, // +10
      authorityInstability: false,
      chameleonScore: null, // excluded
    });
    expect(o.factors.map((f) => f.points)).toEqual([25, 10]);
    expect(o.factors.every((f) => f.points !== 0)).toBe(true);
  });

  it("treats a strong BASIC percentile tier correctly", () => {
    expect(computeOutlook({ ...clean, trajectoryVerdict: "stable", worstBasicPercentile: 80 }).score).toBe(12);
    expect(computeOutlook({ ...clean, trajectoryVerdict: "stable", worstBasicPercentile: 92 }).score).toBe(25);
  });
});
