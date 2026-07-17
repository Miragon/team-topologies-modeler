import { expect, test } from "vitest";
import { Modeler, isTtTeam } from "@miragon/team-topologies-renderer";
import type { TtElement, TtTeam } from "@miragon/team-topologies-renderer";
import { SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";

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
