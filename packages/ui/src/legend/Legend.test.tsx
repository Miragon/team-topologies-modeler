import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ALL_INTERACTION_SPECS, ALL_TEAM_SPECS } from "@miragon/team-topologies-schema-model";
import { Legend } from "./Legend";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Legend", () => {
  let host: HTMLElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("renders nothing while closed", () => {
    act(() => root.render(<Legend open={false} onClose={() => undefined} />));
    expect(host.querySelector(".tt-legend")).toBeNull();
  });

  it("lists every team type, interaction mode and element kind", () => {
    act(() => root.render(<Legend open onClose={() => undefined} />));
    const rows = [...host.querySelectorAll(".tt-legend__row")].map((row) => row.textContent);
    expect(rows).toEqual([
      ...ALL_TEAM_SPECS.map((spec) => spec.label),
      ...ALL_INTERACTION_SPECS.map((spec) => spec.label),
      "Flow of change",
      "Annotation",
    ]);
  });

  it("closes through the host, then asks it to take the keyboard focus", () => {
    const calls: string[] = [];
    const onClose = vi.fn(() => calls.push("close"));
    const onRequestFocusReturn = vi.fn(() => calls.push("focus"));
    act(() =>
      root.render(<Legend open onClose={onClose} onRequestFocusReturn={onRequestFocusReturn} />),
    );

    const hide = host.querySelector<HTMLButtonElement>('button[aria-label="Hide legend"]');
    act(() => hide?.click());

    expect(calls).toEqual(["close", "focus"]);
  });
});
