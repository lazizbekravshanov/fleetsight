import { describe, it, expect } from "vitest";
import { detectQuery } from "./detect";

describe("detectQuery — operators", () => {
  it("officer:", () => expect(detectQuery("officer: John Smith")).toEqual({ type: "officer", value: "John Smith" }));
  it("address:", () => expect(detectQuery("address:123 Main St, Dallas, TX")).toEqual({ type: "address", value: "123 Main St, Dallas, TX" }));
  it("insurer:", () => expect(detectQuery("insurer: Progressive")).toEqual({ type: "insurer", value: "Progressive" }));
  it("vin: is uppercased", () => expect(detectQuery("vin:1hgcm82633a004352")).toEqual({ type: "vin", value: "1HGCM82633A004352" }));
  it("phone: is normalized to 10 digits", () =>
    expect(detectQuery("phone:(609) 228-9327")).toEqual({ type: "phone", value: "6092289327" }));
  it("operator keyword is case-insensitive", () =>
    expect(detectQuery("OFFICER:Smith")).toEqual({ type: "officer", value: "Smith" }));
});

describe("detectQuery — auto-detect", () => {
  it("17-char VIN charset → vin (uppercased)", () =>
    expect(detectQuery("1hgcm82633a004352")).toEqual({ type: "vin", value: "1HGCM82633A004352" }));
  it("bare 10-digit number → phone", () =>
    expect(detectQuery("6092289327")).toEqual({ type: "phone", value: "6092289327" }));
  it("formatted phone → phone (normalized)", () =>
    expect(detectQuery("(609) 228-9327")).toEqual({ type: "phone", value: "6092289327" }));
  it("11-digit with leading 1 → phone (strips country code)", () =>
    expect(detectQuery("1-609-228-9327")).toEqual({ type: "phone", value: "6092289327" }));
  it("short numeric → dot", () => expect(detectQuery("80321")).toEqual({ type: "dot", value: "80321" }));
  it("MC prefix → mc", () => expect(detectQuery("MC123456")).toEqual({ type: "mc", value: "MC123456" }));
  it("plain text → name", () =>
    expect(detectQuery("Swift Transportation")).toEqual({ type: "name", value: "Swift Transportation" }));
  it("empty → name with empty value", () => expect(detectQuery("   ")).toEqual({ type: "name", value: "" }));
  it("a name with digits is not a phone", () =>
    expect(detectQuery("Route 66 Trucking")).toEqual({ type: "name", value: "Route 66 Trucking" }));
});
