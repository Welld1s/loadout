import { describe, it, expect } from "bun:test";
import { INTENSITY_MAP, INTENSITY_LEVELS, clamp, getIntensityMultiplier } from "./rumble";

describe("rumble utils", () => {
  it("has correct intensity map", () => {
    expect(INTENSITY_MAP.off).toBe(0);
    expect(INTENSITY_MAP.low).toBe(0.3);
    expect(INTENSITY_MAP.med).toBe(0.6);
    expect(INTENSITY_MAP.high).toBe(1);
  });

  it("clamps values", () => {
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-0.5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("returns multiplier for level", () => {
    expect(getIntensityMultiplier("high")).toBe(1);
    expect(getIntensityMultiplier("off")).toBe(0);
    // @ts-expect-error testing fallback
    expect(getIntensityMultiplier("invalid")).toBe(0);
  });
});
