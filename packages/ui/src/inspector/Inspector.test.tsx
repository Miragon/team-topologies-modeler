import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { useModelerSelection } from "../useModelerSelection";
import { Inspector } from "./Inspector";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Listener = (event: unknown) => void;

function fakeModeler() {
  const listeners = new Map<string, Set<Listener>>();
  let current: unknown[] = [];
  const fire = (event: string, payload: unknown = {}) =>
    listeners.get(event)?.forEach((listener) => listener(payload));

  const selection = {
    get: () => current,
    select: vi.fn((elements: unknown) => {
      current = elements == null ? [] : [elements].flat();
      fire("selection.changed", { newSelection: current });
    }),
  };
  const canvas = {
    focus: vi.fn(),
    restoreFocus: vi.fn(),
    getContainer: () => document.body,
    viewbox: () => ({ x: 0, y: 0, width: 1000, height: 800, scale: 1 }),
    scroll: vi.fn(),
  };
  const ttModeling = {
    setTeamType: vi.fn(),
    setInteractionMode: vi.fn(),
    updateLabel: vi.fn(),
    setDescription: vi.fn(),
    setColors: vi.fn(),
    detachAnnotation: vi.fn(),
  };
  const modeling = { removeElements: vi.fn() };
  const services: Record<string, unknown> = {
    selection,
    canvas,
    ttModeling,
    modeling,
    dragging: { context: () => null },
  };

  const modeler = {
    on: (event: string, listener: Listener) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)?.add(listener);
    },
    off: (event: string, listener: Listener) => listeners.get(event)?.delete(listener),
    get: (name: string) => {
      if (!(name in services)) throw new Error(`unexpected service ${name}`);
      return services[name];
    },
  };
  const select = (...elements: unknown[]) => act(() => selection.select(elements));
  return {
    modeler: modeler as unknown as Modeler,
    select,
    selection,
    canvas,
    ttModeling,
    modeling,
  };
}

const shape = { x: 0, y: 0, width: 120, height: 80, incoming: [], outgoing: [] };
const team = {
  ...shape,
  id: "team_a",
  ttKind: "team",
  teamType: "stream-aligned",
  ttLabel: "Checkout",
};
const interaction = { ...shape, id: "interaction_a", ttKind: "interaction", mode: "collaboration" };
const flow = { ...shape, id: "flow_a", ttKind: "flow" };
const annotation = { ...shape, id: "annotation_a", ttKind: "annotation", ttLabel: "Why" };

function Host({ modeler, readOnly }: { modeler: Modeler; readOnly?: boolean }) {
  const { selected, revision } = useModelerSelection(modeler);
  return (
    <Inspector modeler={modeler} selected={selected} revision={revision} readOnly={readOnly} />
  );
}

function typeInto(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = Object.getPrototypeOf(field) as object;
  Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function press(target: Element, key: string) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("Inspector", () => {
  let host: HTMLElement;
  let root: Root;

  const panel = () => host.querySelector(".tt-inspector");
  const header = () => host.querySelector(".tt-inspector__header")?.textContent;
  const button = (name: string) =>
    [...host.querySelectorAll("button")].find((candidate) => candidate.textContent === name);

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  it("shows the panel that fits the selection, and nothing without one", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    expect(panel()).toBeNull();

    const headers = [team, interaction, flow, annotation].map((element) => {
      fake.select(element);
      return header();
    });
    expect(headers).toEqual(["Team", "Interaction", "Flow of change", "Annotation"]);

    fake.select(team, interaction);
    expect(header()).toBe("2 elements selected");

    fake.select();
    expect(panel()).toBeNull();
  });

  it("closes on an Escape that no field used, and hands focus to the canvas", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team);

    act(() => press(host.querySelector("select") as Element, "Escape"));

    expect(fake.selection.select).toHaveBeenLastCalledWith(null);
    expect(fake.canvas.focus).toHaveBeenCalled();
    expect(panel()).toBeNull();
  });

  it("lets Escape undo a field's draft without closing the panel", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team);
    const name = host.querySelector<HTMLInputElement>('input[type="text"]');
    if (!name) throw new Error("no name field");

    act(() => typeInto(name, "Payments"));
    act(() => press(name, "Escape"));

    expect(name.value).toBe("Checkout");
    expect(panel()).not.toBeNull();
    expect(fake.selection.select).toHaveBeenCalledTimes(1);
  });

  it("commits a field's draft once, on Enter", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team);
    const name = host.querySelector<HTMLInputElement>('input[type="text"]');
    if (!name) throw new Error("no name field");

    act(() => name.focus());
    act(() => typeInto(name, "  Payments  "));
    act(() => press(name, "Enter"));

    expect(fake.ttModeling.updateLabel).toHaveBeenCalledTimes(1);
    expect(fake.ttModeling.updateLabel).toHaveBeenCalledWith(team, "Payments");
  });

  it("deletes a multi-selection together and hands focus to the canvas", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team, interaction, flow);

    act(() => button("Delete 3 elements")?.click());

    expect(fake.modeling.removeElements).toHaveBeenCalledWith([team, interaction, flow]);
    expect(fake.canvas.focus).toHaveBeenCalled();
  });

  it("offers to reset colours only when a team has its own", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));

    fake.select(team);
    expect(button("Reset colours")).toBeUndefined();

    const coloured = { ...team, id: "team_b", fill: "#ffeeaa" };
    fake.select(coloured);
    act(() => button("Reset colours")?.click());
    expect(fake.ttModeling.setColors).toHaveBeenCalledWith(coloured, undefined, undefined);
  });

  it("detaches an attached annotation", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} />));
    const attached = { ...annotation, outgoing: [] as unknown[] };
    attached.outgoing.push({ ttKind: "association", source: attached, target: team });

    fake.select(attached);
    expect(host.textContent).toContain("Attached to “Checkout”.");
    act(() => button("Detach")?.click());

    expect(fake.ttModeling.detachAnnotation).toHaveBeenCalledWith(attached);
  });

  it("disables every control but Close while read-only", () => {
    const fake = fakeModeler();
    act(() => root.render(<Host modeler={fake.modeler} readOnly />));
    fake.select(team);

    const controls = [...host.querySelectorAll<HTMLInputElement>("input, select, textarea")];
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((control) => control.matches(":disabled"))).toBe(true);
    expect(button("Delete team")?.matches(":disabled")).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Close"]')?.disabled).toBe(false);
  });

  it("gives the canvas the focus a removed panel field had", () => {
    const fake = fakeModeler();
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team);
    act(() => host.querySelector("textarea")?.focus());

    fake.select();

    expect(document.activeElement).toBe(document.body);
    expect(fake.canvas.restoreFocus).toHaveBeenCalledTimes(1);
  });

  it("leaves the focus alone when this document doesn't have it", () => {
    const fake = fakeModeler();
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    act(() => root.render(<Host modeler={fake.modeler} />));
    fake.select(team);

    fake.select();

    expect(fake.canvas.restoreFocus).not.toHaveBeenCalled();
  });
});
