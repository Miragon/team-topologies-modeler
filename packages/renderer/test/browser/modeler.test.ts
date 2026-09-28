import { expect, test } from "vitest";
import {
  Modeler,
  isTtAnnotation,
  isTtAssociation,
  isTtTeam,
} from "@miragon/team-topologies-renderer";
import type {
  TtAnnotation,
  TtAssociation,
  TtElement,
  TtTeam,
} from "@miragon/team-topologies-renderer";
import { SAMPLE_DOCUMENT, type TtDocument } from "@miragon/team-topologies-schema-model";

function mountModeler(): { modeler: Modeler; container: HTMLDivElement } {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "640px";
  document.body.appendChild(container);
  return { modeler: new Modeler({ container }), container };
}

// Real-browser integration: diagram-js relies on SVGElement.getBBox() / getComputedTextLength(),
// which jsdom cannot provide — so this runs in headless Chromium (npm run test:browser).
test("renders the sample document and exports an SVG snapshot", () => {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "640px";
  document.body.appendChild(container);

  const modeler = new Modeler({ container });
  try {
    const { warnings } = modeler.importDocument(SAMPLE_DOCUMENT);
    expect(warnings).toHaveLength(0);

    const exported = modeler.exportDocument();
    expect(exported.nodes).toHaveLength(SAMPLE_DOCUMENT.nodes.length);
    expect(exported.interactions).toHaveLength(SAMPLE_DOCUMENT.interactions.length);

    const { svg } = modeler.saveSVG();
    expect(svg).toContain("<svg");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

// Regression: elements must never "glue" to one another. diagram-js otherwise
// re-parents a shape into whatever it is dropped on / created over, so the two
// then move together.
test("dropping a shape onto another element does not re-parent it", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);

    const registry = modeler.get<{ getAll(): TtElement[] }>("elementRegistry");
    const rules = modeler.get<{ allowed(action: string, context: unknown): unknown }>("rules");
    const root = modeler.get<{ getRootElement(): unknown }>("canvas").getRootElement();
    const teams = registry.getAll().filter(isTtTeam);
    expect(teams.length).toBeGreaterThanOrEqual(2);

    // hovering another element while moving is ignored (no nesting)…
    expect(rules.allowed("elements.move", { shapes: [teams[0]], target: teams[1] })).toBe(null);
    // …while dropping on the canvas (the parent-less root) stays allowed.
    expect(rules.allowed("elements.move", { shapes: [teams[0]], target: root })).toBe(true);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

// Copy-paste: our domain data lives as flat props on the shape (no moddle), so
// the copy step must carry them onto diagram-js' descriptor, and paste must mint
// a fresh model-style id (never a diagram-js `shape_N`, which would collide with
// re-imported ids).
test("copy preserves Team Topologies props and paste mints a fresh id", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);

    const registry = modeler.get<{ getAll(): TtElement[] }>("elementRegistry");
    const copyPaste = modeler.get<{
      copy(elements: unknown[]): void;
      createShape(attrs: unknown): TtTeam;
    }>("copyPaste");
    const clipboard = modeler.get<{
      get(): Record<string, Array<Record<string, unknown>>>;
    }>("clipboard");
    const team = registry.getAll().find(isTtTeam) as TtTeam;

    copyPaste.copy([team]);

    // (1) the copy hook writes the tt* props onto the clipboard descriptor…
    const descriptors = Object.values(clipboard.get()).flat();
    const descriptor = descriptors.find((d) => d.id === team.id) as Record<string, unknown>;
    expect(descriptor.ttKind).toBe("team");
    expect(descriptor.teamType).toBe(team.teamType);
    expect(descriptor.ttLabel).toBe(team.ttLabel);

    // (2) …and createShape rebuilds the shape with a fresh `team_` id, keeping
    // the props (paste strips `priority`/`parent` before calling createShape).
    const { priority: _priority, parent: _parent, ...attrs } = descriptor;
    const pasted = copyPaste.createShape(attrs);
    expect(pasted.id).not.toBe(team.id);
    expect(pasted.id.startsWith("team_")).toBe(true);
    expect(pasted.teamType).toBe(team.teamType);
    expect(pasted.ttLabel).toBe(team.ttLabel);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("creating a shape over another element keeps it on the root", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);

    const registry = modeler.get<{ getAll(): TtElement[] }>("elementRegistry");
    const root = modeler.get<{ getRootElement(): unknown }>("canvas").getRootElement();
    const modeling = modeler.get<{
      createShape(shape: unknown, position: unknown, target: unknown): TtElement;
    }>("modeling");
    const factory = modeler.get<{ createNewInteraction(mode: string): unknown }>(
      "ttElementFactory",
    );
    const team = registry.getAll().find(isTtTeam) as TtTeam;

    const created = modeling.createShape(
      factory.createNewInteraction("collaboration"),
      { x: team.x + team.width / 2, y: team.y + team.height / 2 },
      team,
    );

    expect(created.parent).toBe(root);
    expect(team.children).not.toContain(created);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

// --- annotations (issue #92) -------------------------------------------------

const ANNOTATED_DOCUMENT: TtDocument = {
  ...SAMPLE_DOCUMENT,
  annotations: [
    {
      id: "ann_note",
      text: "Splits into two stream-aligned teams in Q3",
      position: { x: 1080, y: 380 },
      size: { width: 200, height: 64 },
      attachedTo: "team_checkout",
    },
    {
      id: "ann_free",
      text: "Open question",
      position: { x: 40, y: 420 },
      size: { width: 160, height: 48 },
    },
  ],
};

interface Services {
  registry: {
    get(id: string): unknown;
    getAll(): unknown[];
    filter(fn: (element: unknown) => boolean): unknown[];
  };
  modeling: {
    moveElements(shapes: unknown[], delta: { x: number; y: number }): void;
    removeElements(elements: unknown[]): void;
    connect(source: unknown, target: unknown, attrs?: unknown): TtAssociation;
  };
  ttModeling: {
    appendAnnotation(element: unknown): TtAnnotation;
    updateLabel(element: unknown, label: string): void;
  };
  commandStack: { undo(): void; redo(): void };
  rules: { allowed(action: string, context: unknown): unknown };
  selection: { get(): unknown[]; select(elements: unknown): void };
  canvas: { zoom(level?: number): number; getContainer(): HTMLElement };
  labelEditing: { activate(element: unknown): void };
}

function services(modeler: Modeler): Services {
  return {
    registry: modeler.get("elementRegistry"),
    modeling: modeler.get("modeling"),
    ttModeling: modeler.get("ttModeling"),
    commandStack: modeler.get("commandStack"),
    rules: modeler.get("rules"),
    selection: modeler.get("selection"),
    canvas: modeler.get("canvas"),
    labelEditing: modeler.get("ttLabelEditing"),
  };
}

function associations(modeler: Modeler): TtAssociation[] {
  return services(modeler).registry.filter(isTtAssociation) as TtAssociation[];
}

/** True when `point` lies on the rectangular outline of `shape` (±1px). */
function isOnOutline(point: { x: number; y: number }, shape: TtElement): boolean {
  const withinX = point.x >= shape.x - 1 && point.x <= shape.x + shape.width + 1;
  const withinY = point.y >= shape.y - 1 && point.y <= shape.y + shape.height + 1;
  const onVertical =
    Math.abs(point.x - shape.x) <= 1 || Math.abs(point.x - (shape.x + shape.width)) <= 1;
  const onHorizontal =
    Math.abs(point.y - shape.y) <= 1 || Math.abs(point.y - (shape.y + shape.height)) <= 1;
  return withinX && withinY && (onVertical || onHorizontal);
}

test("imports attached annotations with a connector cropped to both outlines", () => {
  const { modeler, container } = mountModeler();
  try {
    const { warnings } = modeler.importDocument(ANNOTATED_DOCUMENT);
    expect(warnings).toHaveLength(0);

    const { registry } = services(modeler);
    const note = registry.get("ann_note") as TtAnnotation;
    const team = registry.get("team_checkout") as TtTeam;
    const [connector] = associations(modeler);
    expect(associations(modeler)).toHaveLength(1);
    expect(connector.source).toBe(note);
    expect(connector.target).toBe(team);
    expect(isOnOutline(connector.waypoints[0], note)).toBe(true);
    expect(isOnOutline(connector.waypoints[connector.waypoints.length - 1], team)).toBe(true);

    const exported = modeler.exportDocument();
    expect(exported.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "ann_note", attachedTo: "team_checkout" }),
        expect.objectContaining({ id: "ann_free", text: "Open question" }),
      ]),
    );
    expect(exported.annotations.find((a) => a.id === "ann_free")).not.toHaveProperty("attachedTo");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("drops a connector to an unknown element with a warning, keeping the annotation", () => {
  const { modeler, container } = mountModeler();
  try {
    const { warnings } = modeler.importDocument({
      ...SAMPLE_DOCUMENT,
      annotations: [
        {
          id: "ann_orphan",
          text: "x",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 40 },
          attachedTo: "team_missing",
        },
      ],
    });
    expect(warnings).toHaveLength(1);
    expect(associations(modeler)).toHaveLength(0);
    expect(modeler.exportDocument().annotations).toEqual([
      expect.objectContaining({ id: "ann_orphan" }),
    ]);
    expect(modeler.exportDocument().annotations[0]).not.toHaveProperty("attachedTo");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("the connector follows its element when the element moves", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry, modeling } = services(modeler);
    const team = registry.get("team_checkout") as TtTeam;

    modeling.moveElements([team], { x: 0, y: 200 });

    const [connector] = associations(modeler);
    expect(isOnOutline(connector.waypoints[connector.waypoints.length - 1], team)).toBe(true);
    expect(modeler.exportDocument().annotations).toContainEqual(
      expect.objectContaining({ id: "ann_note", attachedTo: "team_checkout" }),
    );
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("'Add annotation' creates an attached annotation as a single undo step", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument({ ...SAMPLE_DOCUMENT, annotations: [] });
    const { registry, ttModeling, commandStack } = services(modeler);
    const team = registry.get("team_platform") as TtTeam;

    const annotation = ttModeling.appendAnnotation(team);

    expect(isTtAnnotation(annotation)).toBe(true);
    expect(annotation.x).toBeGreaterThan(team.x + team.width);
    expect(modeler.exportDocument().annotations).toEqual([
      expect.objectContaining({ id: annotation.id, attachedTo: "team_platform" }),
    ]);

    commandStack.undo();
    expect(modeler.exportDocument().annotations).toEqual([]);
    expect(associations(modeler)).toHaveLength(0);

    commandStack.redo();
    expect(modeler.exportDocument().annotations).toEqual([
      expect.objectContaining({ id: annotation.id, attachedTo: "team_platform" }),
    ]);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("deleting the attached element keeps the annotation and drops only its connector", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry, modeling } = services(modeler);

    modeling.removeElements([registry.get("team_checkout")]);

    expect(associations(modeler)).toHaveLength(0);
    const note = modeler.exportDocument().annotations.find((a) => a.id === "ann_note");
    expect(note).toBeDefined();
    expect(note).not.toHaveProperty("attachedTo");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("annotations connect only to teams, interactions and flows — and to one at a time", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry, rules, modeling } = services(modeler);
    const note = registry.get("ann_note");
    const free = registry.get("ann_free");
    const team = registry.get("team_checkout");
    const platform = registry.get("team_platform");
    const interaction = registry.get("int_checkout_fraud");

    expect(rules.allowed("connection.create", { source: free, target: team })).toEqual({
      ttKind: "association",
    });
    expect(rules.allowed("connection.create", { source: interaction, target: free })).toEqual({
      ttKind: "association",
    });
    expect(rules.allowed("connection.create", { source: team, target: platform })).toBe(false);
    expect(rules.allowed("connection.create", { source: note, target: free })).toBe(false);

    // Re-attaching replaces the previous connector.
    modeling.connect(note, platform, { ttKind: "association" });
    expect(associations(modeler)).toHaveLength(1);
    expect(modeler.exportDocument().annotations).toContainEqual(
      expect.objectContaining({ id: "ann_note", attachedTo: "team_platform" }),
    );
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("copying an annotation together with its element carries the connector along", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry } = services(modeler);
    const copyPaste = modeler.get<{ copy(elements: unknown[]): void }>("copyPaste");
    const clipboard = modeler.get<{ get(): Record<string, Array<Record<string, unknown>>> }>(
      "clipboard",
    );

    copyPaste.copy([registry.get("ann_note"), registry.get("team_checkout")]);

    const descriptors = Object.values(clipboard.get()).flat();
    expect(descriptors.find((d) => d.id === "ann_note")?.ttKind).toBe("annotation");
    expect(descriptors.find((d) => d.ttKind === "association")).toBeDefined();
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("renders explicit line breaks and wraps annotation text left-aligned", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry, ttModeling } = services(modeler);
    ttModeling.updateLabel(registry.get("ann_free"), "First line\nSecond line");

    const texts = container.querySelectorAll('[data-element-id="ann_free"] .djs-visual > text');
    expect([...texts].map((t) => t.textContent)).toEqual(["First line", "Second line"]);
    expect(getComputedStyle(texts[0]).textAnchor).toBe("start");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

// --- multi-selection (issue #91) ---------------------------------------------

function press(key: string, init: KeyboardEventInit = {}): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

test("Ctrl/Cmd+A selects every element; a group move is one undo step", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(ANNOTATED_DOCUMENT);
    const { registry, selection, modeling, commandStack } = services(modeler);

    press("a", { ctrlKey: true });

    const all = registry.filter((element) => Boolean((element as { parent?: unknown }).parent));
    expect(all).toHaveLength(13);
    expect(selection.get()).toHaveLength(all.length);

    const before = modeler.exportDocument();
    const shapes = selection.get().filter((element) => !isTtAssociation(element));
    modeling.moveElements(shapes, { x: 30, y: 40 });

    const moved = modeler.exportDocument();
    moved.nodes.forEach((node, idx) => {
      expect(node.position.x - before.nodes[idx].position.x).toBe(30);
      expect(node.position.y - before.nodes[idx].position.y).toBe(40);
    });
    expect(moved.annotations).toContainEqual(
      expect.objectContaining({ id: "ann_note", attachedTo: "team_checkout" }),
    );

    commandStack.undo();
    expect(modeler.exportDocument()).toEqual(before);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("Ctrl/Cmd+A inside a text field is left to the browser", () => {
  const { modeler, container } = mountModeler();
  const input = document.createElement("input");
  document.body.appendChild(input);
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true }));
    expect(services(modeler).selection.get()).toHaveLength(0);
  } finally {
    input.remove();
    modeler.destroy();
    container.remove();
  }
});

test("arrow keys nudge the selection (Shift for bigger steps)", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    const { registry, selection } = services(modeler);
    const team = registry.get("team_checkout") as TtTeam;
    const interaction = registry.get("int_checkout_fraud") as TtElement;
    const start = { team: { x: team.x, y: team.y }, interaction: { x: interaction.x } };
    selection.select([team, interaction]);

    press("ArrowRight");
    press("ArrowDown", { shiftKey: true });

    expect(team.x).toBe(start.team.x + 1);
    expect(team.y).toBe(start.team.y + 10);
    expect(interaction.x).toBe(start.interaction.x + 1);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("the lasso selects every element inside its frame", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    const { registry, selection } = services(modeler);
    const lassoTool = modeler.get<{ select(elements: unknown[], bbox: unknown): void }>(
      "lassoTool",
    );

    // The frame encloses the enabling team and the facilitating glyph beside it only.
    lassoTool.select(registry.getAll(), { x: 50, y: 140, width: 210, height: 220 });

    expect(
      selection
        .get()
        .map((element) => (element as TtElement).id)
        .sort(),
    ).toEqual(["int_testing_discovery", "team_test_automation"]);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

// --- in-place label editing (issue #93) --------------------------------------

function editor(container: HTMLElement): HTMLTextAreaElement | null {
  return container.querySelector("textarea.tt-label-editor");
}

test("the label editor sits on the element, scales with the zoom and hides the rendered label", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    const { registry, canvas, labelEditing } = services(modeler);
    const team = registry.get("team_checkout") as TtTeam;
    canvas.zoom(2);

    labelEditing.activate(team);

    const textarea = editor(container)!;
    expect(textarea).not.toBeNull();
    expect(document.activeElement).toBe(textarea);
    expect(textarea.value).toBe(team.ttLabel);
    expect(parseFloat(textarea.style.fontSize)).toBeCloseTo(13.5 * 2);
    expect(parseFloat(textarea.style.width)).toBeCloseTo((team.width - 20) * 2);

    const teamBox = container.querySelector(`[data-element-id="${team.id}"]`)!;
    const editorBox = textarea.getBoundingClientRect();
    const shapeBox = teamBox.getBoundingClientRect();
    expect(editorBox.left).toBeGreaterThanOrEqual(shapeBox.left);
    expect(editorBox.right).toBeLessThanOrEqual(shapeBox.right);
    expect(editorBox.top).toBeGreaterThanOrEqual(shapeBox.top);
    expect(editorBox.bottom).toBeLessThanOrEqual(shapeBox.bottom);

    const label = teamBox.querySelector(".djs-visual > text")!;
    expect(getComputedStyle(label).visibility).toBe("hidden");
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("Enter commits one undo step, Shift+Enter keeps a line break, Escape discards", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    const { registry, labelEditing, commandStack } = services(modeler);
    const team = registry.get("team_checkout") as TtTeam;
    const original = team.ttLabel;

    labelEditing.activate(team);
    editor(container)!.value = "Expertise Backoffice\nPlatforms (Enabling Team)";
    editor(container)!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(editor(container)).toBeNull();
    expect(team.ttLabel).toBe("Expertise Backoffice\nPlatforms (Enabling Team)");
    const label = container.querySelector(`[data-element-id="${team.id}"] .djs-visual > text`)!;
    expect(getComputedStyle(label).visibility).toBe("visible");

    commandStack.undo();
    expect(team.ttLabel).toBe(original);

    labelEditing.activate(team);
    editor(container)!.value = "Discarded";
    editor(container)!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(editor(container)).toBeNull();
    expect(team.ttLabel).toBe(original);
  } finally {
    modeler.destroy();
    container.remove();
  }
});

test("small elements still get an editor wide enough to type in", () => {
  const { modeler, container } = mountModeler();
  try {
    modeler.importDocument(SAMPLE_DOCUMENT);
    const { registry, canvas, labelEditing } = services(modeler);
    canvas.zoom(1);
    labelEditing.activate(registry.get("int_platform_checkout"));

    expect(parseFloat(editor(container)!.style.width)).toBeGreaterThanOrEqual(96);
  } finally {
    modeler.destroy();
    container.remove();
  }
});
