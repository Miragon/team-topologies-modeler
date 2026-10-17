import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { useModelerSelection, type ModelerSelection } from "./useModelerSelection";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Listener = (event: unknown) => void;

function fakeModeler(initialSelection: unknown[] = []) {
  const listeners = new Map<string, Set<Listener>>();
  const modeler = {
    on: (event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    off: (event: string, listener: Listener) => listeners.get(event)?.delete(listener),
    get: (name: string) => {
      if (name !== "selection") throw new Error(`unexpected service ${name}`);
      return { get: () => initialSelection };
    },
  };
  const fire = (event: string, payload: unknown = {}) =>
    act(() => listeners.get(event)?.forEach((listener) => listener(payload)));
  const listenerCount = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  return { modeler: modeler as unknown as Modeler, fire, listenerCount };
}

const team = { id: "team_a", ttKind: "team", teamType: "stream-aligned" };
const interaction = { id: "interaction_a", ttKind: "interaction", mode: "collaboration" };
const association = { id: "association_a", ttKind: "association" };

describe("useModelerSelection", () => {
  let host: HTMLElement;
  let root: Root;
  let latest: ModelerSelection | undefined;

  function Probe({ modeler }: { modeler: Modeler }) {
    latest = useModelerSelection(modeler);
    return null;
  }

  beforeEach(() => {
    host = document.createElement("div");
    root = createRoot(host);
    latest = undefined;
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it("reports the one selected element and nothing for several or for connectors", () => {
    const { modeler, fire } = fakeModeler();
    act(() => root.render(<Probe modeler={modeler} />));
    expect(latest?.selected).toBeNull();

    fire("selection.changed", { newSelection: [team] });
    expect(latest?.selected).toBe(team);

    fire("selection.changed", { newSelection: [team, interaction] });
    expect(latest?.selected).toBeNull();

    fire("selection.changed", { newSelection: [association] });
    expect(latest?.selected).toBeNull();
  });

  it("picks up a selection made before it mounted", () => {
    const { modeler } = fakeModeler([interaction]);
    act(() => root.render(<Probe modeler={modeler} />));
    expect(latest?.selected).toBe(interaction);
  });

  it("bumps the revision on every model change and import", () => {
    const { modeler, fire } = fakeModeler();
    act(() => root.render(<Probe modeler={modeler} />));
    const start = latest?.revision ?? 0;

    fire("commandStack.changed");
    fire("elements.changed");
    fire("import.done");

    expect(latest?.revision).toBe(start + 3);
  });

  it("unsubscribes when the host unmounts", () => {
    const { modeler, listenerCount } = fakeModeler();
    act(() => root.render(<Probe modeler={modeler} />));
    expect(listenerCount()).toBe(4);
    act(() => root.render(<></>));
    expect(listenerCount()).toBe(0);
  });
});
