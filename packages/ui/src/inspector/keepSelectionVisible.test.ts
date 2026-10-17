import { describe, expect, it } from "vitest";
import { shiftInto } from "./keepSelectionVisible";

describe("shiftInto", () => {
  it("leaves a range that already fits", () => {
    expect(shiftInto(20, 80, 0, 100)).toBe(0);
  });

  it("moves a range back from beyond the far edge", () => {
    expect(shiftInto(60, 130, 0, 100)).toBe(-30);
  });

  it("moves a range forward from before the near edge", () => {
    expect(shiftInto(-25, 40, 0, 100)).toBe(25);
  });

  it("keeps the start visible when the range is wider than the space", () => {
    expect(shiftInto(50, 250, 0, 100)).toBe(-50);
    expect(shiftInto(-80, 150, 0, 100)).toBe(80);
  });
});
