import { describe, expect, it } from "vitest";
import { takeLegacyLegendOpen } from "./state";

function stateApi(initial: unknown) {
  let state = initial;
  return {
    getState: () => state,
    setState: (next: unknown) => {
      state = next;
    },
    current: () => state,
  };
}

describe("takeLegacyLegendOpen", () => {
  it("carries the stored choice over once and removes the old key", () => {
    const api = stateApi({ legendOpen: false, modelerShell: { view: 1 } });
    expect(takeLegacyLegendOpen(api)).toBe(false);
    expect(api.current()).toEqual({ modelerShell: { view: 1 } });
    expect(takeLegacyLegendOpen(api)).toBeUndefined();
  });

  it("leaves a state without the old key alone", () => {
    const api = stateApi(undefined);
    expect(takeLegacyLegendOpen(api)).toBeUndefined();
    expect(api.current()).toBeUndefined();
  });
});
