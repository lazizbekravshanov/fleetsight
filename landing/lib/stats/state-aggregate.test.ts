import { describe, it, expect } from "vitest";
import { buildStateMap } from "./state-aggregate";

describe("buildStateMap", () => {
  it("merges inspections + crashes + fatalities by state", () => {
    const m = buildStateMap(
      [{ report_state: "TX", n: "100" }, { report_state: "CA", n: "60" }],
      [
        { report_state: "TX", crashes: "30", fatalities: "5" },
        { report_state: "CA", crashes: "20", fatalities: "3" },
      ]
    );
    expect(m.states.TX).toEqual({ inspections: 100, crashes: 30, fatalities: 5 });
    expect(m.states.CA).toEqual({ inspections: 60, crashes: 20, fatalities: 3 });
  });

  it("zero-fills a metric when a state appears in only one source", () => {
    const m = buildStateMap([{ report_state: "NY", n: "40" }], [{ report_state: "OH", crashes: "10", fatalities: "1" }]);
    expect(m.states.NY).toEqual({ inspections: 40, crashes: 0, fatalities: 0 });
    expect(m.states.OH).toEqual({ inspections: 0, crashes: 10, fatalities: 1 });
  });

  it("sums duplicate rows for the same state", () => {
    const m = buildStateMap([{ report_state: "TX", n: "100" }, { report_state: "TX", n: "25" }], []);
    expect(m.states.TX.inspections).toBe(125);
  });

  it("computes the per-metric maximum across states", () => {
    const m = buildStateMap(
      [{ report_state: "TX", n: "100" }, { report_state: "CA", n: "60" }],
      [{ report_state: "TX", crashes: "30", fatalities: "5" }, { report_state: "CA", crashes: "80", fatalities: "2" }]
    );
    expect(m.max).toEqual({ inspections: 100, crashes: 80, fatalities: 5 });
  });

  it("ignores blank or invalid state codes", () => {
    const m = buildStateMap([{ report_state: "", n: "9" }, { report_state: "XYZ", n: "9" }, { n: "9" }], []);
    expect(Object.keys(m.states)).toEqual([]);
    expect(m.max).toEqual({ inspections: 0, crashes: 0, fatalities: 0 });
  });

  it("uppercases state codes", () => {
    const m = buildStateMap([{ report_state: "tx", n: "5" }], []);
    expect(m.states.TX?.inspections).toBe(5);
  });
});
