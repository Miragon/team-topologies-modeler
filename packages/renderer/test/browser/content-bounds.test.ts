import { afterEach, describe, expect, test } from "vitest";
import type { ElementBounds } from "@miragon/modeler-api";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type { Root, Shape } from "diagram-js/lib/model/Types";
import {
  Modeler,
  NavigatedViewer,
  Viewer,
  createCollaborativeModeler,
  createCollaborativeViewer,
  type TtBaseViewer,
  type TtElementFactory,
} from "@miragon/team-topologies-renderer";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";

const hosts: HTMLElement[] = [];
const diagrams: Array<{ destroy(): void }> = [];

afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  for (const host of hosts.splice(0)) host.remove();
});

function host(): HTMLElement {
  const element = document.createElement("div");
  element.style.width = "900px";
  element.style.height = "640px";
  document.body.appendChild(element);
  hosts.push(element);
  return element;
}

function mounted<T extends TtBaseViewer>(create: (container: HTMLElement) => T): T {
  const diagram = create(host());
  diagrams.push(diagram);
  return diagram;
}

/** The box around every team, interaction, flow and annotation as the document places them. */
function documentBounds(document: TtDocument): ElementBounds {
  const boxes = [
    ...document.nodes,
    ...document.interactions,
    ...document.flows,
    ...document.annotations,
  ];
  const left = Math.min(...boxes.map((box) => box.position.x));
  const top = Math.min(...boxes.map((box) => box.position.y));
  const right = Math.max(...boxes.map((box) => box.position.x + box.size.width));
  const bottom = Math.max(...boxes.map((box) => box.position.y + box.size.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const ANNOTATED_DOCUMENT: TtDocument = {
  ...SAMPLE_DOCUMENT,
  annotations: [
    {
      id: "ann_far_left",
      text: "Owns the payment providers",
      position: { x: -240, y: 30 },
      size: { width: 180, height: 56 },
      attachedTo: "team_checkout",
    },
  ],
};

describe("contentBounds", () => {
  test("is undefined before the first import and for a document without elements", () => {
    const modeler = mounted((container) => new Modeler({ container }));
    expect(modeler.contentBounds()).toBeUndefined();

    modeler.importDocument(emptyDocument());

    expect(modeler.contentBounds()).toBeUndefined();
  });

  test("is the tight box around every element, connected annotations included", () => {
    const modeler = mounted((container) => new Modeler({ container }));

    modeler.importDocument(ANNOTATED_DOCUMENT);

    expect(modeler.contentBounds()).toEqual(documentBounds(ANNOTATED_DOCUMENT));
  });

  test("is the same in every viewer", () => {
    const expected = documentBounds(SAMPLE_DOCUMENT);
    const creators: Array<(container: HTMLElement) => TtBaseViewer> = [
      (container) => new Viewer({ container }),
      (container) => new NavigatedViewer({ container }),
      (container) => new Modeler({ container }),
    ];
    for (const create of creators) {
      const diagram = mounted(create);
      diagram.importDocument(SAMPLE_DOCUMENT);
      expect(diagram.contentBounds()).toEqual(expected);
    }
  });

  test("follows an element created or moved on the canvas at once", () => {
    const modeler = mounted((container) => new Modeler({ container }));
    modeler.importDocument(SAMPLE_DOCUMENT);
    const before = documentBounds(SAMPLE_DOCUMENT);
    const modeling = modeler.get<Modeling>("modeling");
    const team = modeler
      .get<TtElementFactory>("ttElementFactory")
      .createNewTeam("platform", "Data platform");

    const created = modeling.createShape(
      team as unknown as Shape,
      { x: before.x + before.width + 400, y: before.y + before.height + 300 },
      modeler.get<Canvas>("canvas").getRootElement() as Root,
    );

    expect(modeler.contentBounds()).toEqual({
      x: before.x,
      y: before.y,
      width: created.x + created.width - before.x,
      height: created.y + created.height - before.y,
    });

    modeling.moveElements([created], { x: -(created.x - before.x) - 500, y: 0 });

    expect(modeler.contentBounds()?.x).toBe(before.x - 500);
  });

  test("stays the same across zoom and scroll", () => {
    const modeler = mounted((container) => new Modeler({ container }));
    modeler.importDocument(SAMPLE_DOCUMENT);
    const canvas = modeler.get<Canvas>("canvas");
    const before = modeler.contentBounds();

    canvas.zoom(2.5, { x: 100, y: 100 });
    canvas.scroll({ dx: 320, dy: -180 });

    expect(modeler.contentBounds()).toEqual(before);
  });

  test("is undefined after destroy, without building a new diagram", () => {
    const container = host();
    const modeler = new Modeler({ container });
    modeler.importDocument(SAMPLE_DOCUMENT);

    modeler.destroy();

    expect(modeler.contentBounds()).toBeUndefined();
    expect(container.childElementCount).toBe(0);
  });
});

describe("contentBounds of the collaborative modeler and viewer", () => {
  test("reports the renderer's box in both mounts", async () => {
    const text = serializeDocument(ANNOTATED_DOCUMENT);
    for (const create of [createCollaborativeModeler, createCollaborativeViewer]) {
      const collaborative = create();
      diagrams.push(collaborative);
      collaborative.attachTo(host());
      expect(collaborative.contentBounds()).toBeUndefined();

      await collaborative.importText(text);

      expect(collaborative.contentBounds()).toEqual(documentBounds(ANNOTATED_DOCUMENT));
      expect(collaborative.contentBounds()).toEqual(collaborative.diagram.contentBounds());
    }
  });

  test("an element of the live canvas counts, and a new empty file has none", async () => {
    const collaborative = createCollaborativeModeler();
    diagrams.push(collaborative);
    collaborative.attachTo(host());
    await collaborative.importText(serializeDocument(SAMPLE_DOCUMENT));
    const diagram = collaborative.diagram;
    const team = diagram.get<ElementRegistry>("elementRegistry").get("team_checkout") as Shape;

    diagram.get<Modeling>("modeling").moveElements([team], { x: 0, y: 2000 });

    const bounds = collaborative.contentBounds();
    expect(bounds && bounds.y + bounds.height).toBe(team.y + team.height);

    await collaborative.importText("");

    expect(collaborative.contentBounds()).toBeUndefined();
  });

  test("is undefined after destroy", async () => {
    const collaborative = createCollaborativeViewer();
    collaborative.attachTo(host());
    await collaborative.importText(serializeDocument(SAMPLE_DOCUMENT));

    collaborative.destroy();

    expect(collaborative.contentBounds()).toBeUndefined();
  });
});
