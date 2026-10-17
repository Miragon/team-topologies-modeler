import { describe, expect, it, vi } from "vitest";
import { createLegendState, type WebviewStateStore } from "./legendState.js";

function memoryStore(initial?: unknown): WebviewStateStore & { state: unknown } {
  const store = {
    state: initial,
    getState: () => store.state,
    setState: (next: unknown) => {
      store.state = next;
    },
  };
  return store;
}

describe("createLegendState", () => {
  it("follows the pane-size default until the user chooses", () => {
    expect(createLegendState(memoryStore(), () => true).isOpen()).toBe(true);
    expect(createLegendState(memoryStore(), () => false).isOpen()).toBe(false);
  });

  it("does not write the default into the webview state", () => {
    const store = memoryStore();
    createLegendState(store, () => true);
    expect(store.state).toBeUndefined();
  });

  it("prefers the stored choice over the default", () => {
    const openByDefault = vi.fn(() => true);
    const legend = createLegendState(memoryStore({ legendOpen: false }), openByDefault);
    expect(legend.isOpen()).toBe(false);
    expect(openByDefault).not.toHaveBeenCalled();
  });

  it("ignores a stored value that is not a boolean", () => {
    expect(createLegendState(memoryStore({ legendOpen: "yes" }), () => false).isOpen()).toBe(false);
    expect(createLegendState(memoryStore("garbage"), () => true).isOpen()).toBe(true);
  });

  it("stores a change next to the other webview state and notifies subscribers", () => {
    const store = memoryStore({ other: 1 });
    const legend = createLegendState(store, () => false);
    const listener = vi.fn();
    legend.subscribe(listener);

    legend.setOpen(true);

    expect(legend.isOpen()).toBe(true);
    expect(store.state).toEqual({ other: 1, legendOpen: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("skips writes and notifications when nothing changes", () => {
    const store = memoryStore();
    const legend = createLegendState(store, () => true);
    const listener = vi.fn();
    legend.subscribe(listener);

    legend.setOpen(true);

    expect(store.state).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const legend = createLegendState(memoryStore(), () => true);
    const listener = vi.fn();
    const unsubscribe = legend.subscribe(listener);

    unsubscribe();
    legend.setOpen(false);

    expect(listener).not.toHaveBeenCalled();
  });
});
