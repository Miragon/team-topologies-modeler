import { afterEach, describe, expect, it, vi } from "vitest";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { makeRoomForLegend } from "./makeRoomForLegend";

function fakeModeler() {
  const select = vi.fn();
  const modeler = { get: () => ({ select }) } as unknown as Modeler;
  return { modeler, select };
}

describe("makeRoomForLegend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closes the inspector sheet on narrow screens", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    vi.stubGlobal("matchMedia", matchMedia);
    const { modeler, select } = fakeModeler();

    makeRoomForLegend(modeler);

    expect(matchMedia).toHaveBeenCalledWith("(max-width: 760px)");
    expect(select).toHaveBeenCalledWith(null);
  });

  it("keeps the selection where the side panel and the legend fit side by side", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const { modeler, select } = fakeModeler();

    makeRoomForLegend(modeler);

    expect(select).not.toHaveBeenCalled();
  });
});
