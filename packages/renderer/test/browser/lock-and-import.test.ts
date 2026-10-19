import { afterEach, expect, test } from "vitest";
import {
  Modeler,
  READ_ONLY_CHANGED_EVENT,
  type TtElement,
  type TtModeling,
  type TtReadOnly,
} from "@miragon/team-topologies-renderer";
import { SAMPLE_DOCUMENT, type TtDocument } from "@miragon/team-topologies-schema-model";

const mounted: Array<{ modeler: Modeler; container: HTMLElement }> = [];

afterEach(() => {
  for (const { modeler, container } of mounted.splice(0)) {
    modeler.destroy();
    container.remove();
  }
});

function mountModeler(): { modeler: Modeler; container: HTMLDivElement } {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "640px";
  document.body.appendChild(container);
  const modeler = new Modeler({ container });
  mounted.push({ modeler, container });
  return { modeler, container };
}

interface Services {
  registry: { get(id: string): TtElement | undefined };
  selection: { get(): unknown[]; select(elements: unknown): void };
  rules: { allowed(action: string, context: unknown): unknown };
  canvas: {
    getContainer(): HTMLElement;
    viewbox(box?: unknown): { x: number; y: number; width: number; height: number };
  };
  copyPaste: { copy(elements: unknown[]): void };
  readOnly: TtReadOnly;
  ttModeling: TtModeling;
  eventBus: { on(event: string, callback: (event: unknown) => void): void };
}

function services(modeler: Modeler): Services {
  return {
    registry: modeler.get("elementRegistry"),
    selection: modeler.get("selection"),
    rules: modeler.get("rules"),
    canvas: modeler.get("canvas"),
    copyPaste: modeler.get("copyPaste"),
    readOnly: modeler.get("ttReadOnly"),
    ttModeling: modeler.get("ttModeling"),
    eventBus: modeler.get("eventBus"),
  };
}

function pressOn(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

// --- the read-only lock (guide §13.5) --------------------------------------------

test("the lock vetoes every edit rule and announces itself", () => {
  const { modeler } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry, rules, readOnly, eventBus } = services(modeler);
  const team = registry.get("team_checkout")!;
  const changes: unknown[] = [];
  eventBus.on(READ_ONLY_CHANGED_EVENT, (event) =>
    changes.push((event as { readOnly: boolean }).readOnly),
  );

  readOnly.setReadOnly(true);

  for (const action of ["elements.move", "shape.resize", "shape.create", "elements.delete"]) {
    expect(rules.allowed(action, { shapes: [team], shape: team }), action).toBe(false);
  }
  readOnly.setReadOnly(false);
  expect(rules.allowed("shape.resize", { shape: team })).toBe(true);
  expect(changes).toEqual([true, false]);
});

test("under the lock the keyboard only reads: select all and copy, no delete, paste or nudge", () => {
  const { modeler } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry, selection, readOnly } = services(modeler);
  const before = modeler.exportDocument();
  readOnly.setReadOnly(true);

  expect(pressOn(document, "a", { ctrlKey: true }).defaultPrevented).toBe(true);
  expect(selection.get().length).toBeGreaterThan(5);
  expect(pressOn(document, "c", { metaKey: true }).defaultPrevented).toBe(true);

  for (const [key, init] of [
    ["Delete", {}],
    ["Backspace", {}],
    ["ArrowRight", {}],
    ["v", { ctrlKey: true }],
    ["z", { ctrlKey: true }],
  ] as const) {
    expect(pressOn(document, key, init).defaultPrevented, key).toBe(false);
  }
  expect(registry.get("team_checkout")).toBeDefined();
  expect(modeler.exportDocument()).toEqual(before);
});

test("under the lock no context pad and no label editor open", () => {
  const { modeler, container } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry, selection, readOnly } = services(modeler);
  const team = registry.get("team_checkout")!;
  selection.select(team);
  expect(container.querySelectorAll(".djs-context-pad .entry").length).toBeGreaterThan(0);

  readOnly.setReadOnly(true);
  expect(container.querySelector(".djs-context-pad.open")).toBeNull();
  selection.select(null);
  selection.select(team);
  expect(container.querySelectorAll(".djs-context-pad .entry")).toHaveLength(0);

  modeler.get<{ activate(element: TtElement): void }>("ttLabelEditing").activate(team);
  expect(container.querySelector("textarea.tt-label-editor")).toBeNull();
});

test("the lock closes a label editor that is open, without committing it", () => {
  const { modeler, container } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry, readOnly } = services(modeler);
  modeler
    .get<{ activate(element: TtElement): void }>("ttLabelEditing")
    .activate(registry.get("team_checkout")!);
  container.querySelector<HTMLTextAreaElement>("textarea.tt-label-editor")!.value = "Typed";

  readOnly.setReadOnly(true);

  expect(container.querySelector("textarea.tt-label-editor")).toBeNull();
  expect(registry.get("team_checkout")!.ttLabel).toBe("Checkout & Payments");
});

// --- importDocument ---------------------------------------------------------------

function withId(doc: TtDocument, from: string, to: string): TtDocument {
  return JSON.parse(JSON.stringify(doc).replace(`"id":"${from}"`, `"id":"${to}"`)) as TtDocument;
}

test("a document with colliding ids is rejected before the canvas changes", () => {
  const { modeler } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry } = services(modeler);
  modeler
    .get<{ moveElements(shapes: unknown[], delta: unknown): void }>("modeling")
    .moveElements([registry.get("team_checkout")], { x: 10, y: 0 });
  const before = modeler.exportDocument();

  for (const id of ["team_checkout", "tt-root", "__implicitroot_7", "assoc_ann_fraud_handover"]) {
    expect(() => modeler.importDocument(withId(SAMPLE_DOCUMENT, "flow_main", id)), id).toThrow();
  }

  expect(modeler.exportDocument()).toEqual(before);
  expect(modeler.canUndo()).toBe(true);
});

test("an import fires no change on the command stack", () => {
  const { modeler } = mountModeler();
  const changes: unknown[] = [];
  services(modeler).eventBus.on("commandStack.changed", (event) => changes.push(event));

  modeler.importDocument(SAMPLE_DOCUMENT);
  modeler.importDocument(SAMPLE_DOCUMENT);

  expect(changes).toEqual([]);
});

test("an import with fit: false keeps the view", () => {
  const { modeler } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { canvas } = services(modeler);
  canvas.viewbox({ x: -300, y: -200, width: 450, height: 320 });
  const before = canvas.viewbox();

  modeler.importDocument(SAMPLE_DOCUMENT, { fit: false });

  const after = canvas.viewbox();
  expect([after.x, after.y, after.width, after.height]).toEqual([
    before.x,
    before.y,
    before.width,
    before.height,
  ]);
});

// --- the title and unknown fields ---------------------------------------------------

test("renaming the diagram is one undo step", () => {
  const { modeler } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);

  services(modeler).ttModeling.setTitle("Renamed");
  expect(modeler.exportDocument().title).toBe("Renamed");

  modeler.undo();
  expect(modeler.exportDocument().title).toBe(SAMPLE_DOCUMENT.title);
  modeler.redo();
  expect(modeler.exportDocument().title).toBe("Renamed");
});

test("unknown fields survive import, export, a rename and a copy", () => {
  const { modeler } = mountModeler();
  const foreign = {
    ...SAMPLE_DOCUMENT,
    "x-vendor": { keep: "me" },
    nodes: SAMPLE_DOCUMENT.nodes.map((node) =>
      node.id === "team_checkout" ? { ...node, "x-owner": "team-a" } : node,
    ),
  } as TtDocument;
  modeler.importDocument(foreign);
  const { registry, ttModeling, copyPaste } = services(modeler);

  ttModeling.setTitle("Renamed");
  copyPaste.copy([registry.get("team_checkout")]);
  // The clipboard holds the copied tree by depth: its top level is `0`.
  const descriptor = modeler
    .get<{ get(): Record<number, Array<Record<string, unknown>>> }>("clipboard")
    .get()[0]![0]!;

  const exported = modeler.exportDocument() as unknown as Record<string, unknown>;
  expect(exported["x-vendor"]).toEqual({ keep: "me" });
  const checkout = (exported.nodes as Array<Record<string, unknown>>).find(
    (node) => node.id === "team_checkout",
  )!;
  expect(checkout["x-owner"]).toBe("team-a");
  expect(descriptor.ttForeign).toEqual({ "x-owner": "team-a" });
});

// --- an open label edit across an import ----------------------------------------------

test("an edit open during an import reopens with its text on the same element", async () => {
  const { modeler, container } = mountModeler();
  modeler.importDocument(SAMPLE_DOCUMENT);
  const { registry } = services(modeler);
  const labelEditing = modeler.get<{
    activate(element: TtElement): void;
    openEdit(): { elementId: string; value: string } | undefined;
  }>("ttLabelEditing");
  labelEditing.activate(registry.get("team_checkout")!);
  container.querySelector<HTMLTextAreaElement>("textarea.tt-label-editor")!.value = "Typed";

  modeler.importDocument(SAMPLE_DOCUMENT);
  expect(labelEditing.openEdit()).toBeUndefined();
  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(labelEditing.openEdit()).toEqual({ elementId: "team_checkout", value: "Typed" });
  expect(registry.get("team_checkout")!.ttLabel).toBe("Checkout & Payments");
  expect(modeler.canUndo()).toBe(false);
});
