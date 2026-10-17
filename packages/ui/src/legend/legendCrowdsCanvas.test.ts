import { afterEach, describe, expect, it, vi } from "vitest";
import { legendCrowdsCanvas } from "./legendCrowdsCanvas";

describe("legendCrowdsCanvas", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for narrow or short viewports", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    expect(legendCrowdsCanvas()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 760px), (max-height: 820px)");
  });

  it("leaves the legend open where it fits", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(legendCrowdsCanvas()).toBe(false);
  });

  it("treats a missing matchMedia as room enough", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(legendCrowdsCanvas()).toBe(false);
  });
});
