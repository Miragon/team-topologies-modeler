/**
 * Bridges the canonical `TtDocument` into the diagram-js canvas. Stacking order
 * (back → front) is flows, teams, interactions, annotations, so the translucent
 * interaction glyphs read on top of the team boxes they overlay. Attached
 * annotations get their association connector last, once both ends exist.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementFactory from "diagram-js/lib/core/ElementFactory";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import type ConnectionDocking from "diagram-js/lib/layout/ConnectionDocking";
import type { Root } from "diagram-js/lib/model/Types";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import { isTtAnnotation, isTtElement, type TtAnnotation } from "../model/di-types.js";
import type TtElementFactory from "../model/TtElementFactory.js";
import { ROOT_ID, type ImportWarning, type RootBusinessObject } from "./types.js";

type RootWithMeta = Root & { businessObject?: RootBusinessObject };

export default class TtImporter {
  static $inject = [
    "canvas",
    "elementFactory",
    "ttElementFactory",
    "eventBus",
    "elementRegistry",
    "connectionDocking",
  ];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: ElementFactory,
    private readonly factory: TtElementFactory,
    private readonly eventBus: EventBus,
    private readonly elementRegistry: ElementRegistry,
    private readonly connectionDocking: ConnectionDocking,
  ) {}

  import(doc: TtDocument): ImportWarning[] {
    const warnings: ImportWarning[] = [];
    this.eventBus.fire("import.render.start", { document: doc });

    let existing: RootWithMeta | undefined;
    try {
      existing = this.canvas.getRootElement() as RootWithMeta;
    } catch {
      existing = undefined;
    }
    let root: RootWithMeta;
    if (existing && existing.id === ROOT_ID) {
      root = existing;
    } else {
      root = this.elementFactory.createRoot({ id: ROOT_ID }) as RootWithMeta;
      this.canvas.setRootElement(root);
    }
    root.businessObject = { title: doc.title };

    // Back → front: flows, teams, interactions, annotations.
    for (const flow of doc.flows) {
      this.canvas.addShape(this.factory.createFlow(flow), root);
    }
    for (const node of doc.nodes) {
      this.canvas.addShape(this.factory.createTeam(node), root);
    }
    for (const interaction of doc.interactions) {
      this.canvas.addShape(this.factory.createInteraction(interaction), root);
    }
    for (const annotation of doc.annotations) {
      this.canvas.addShape(this.factory.createAnnotation(annotation), root);
    }
    for (const annotation of doc.annotations) {
      if (!annotation.attachedTo) continue;
      const source = this.elementRegistry.get(annotation.id) as TtAnnotation;
      const target = this.elementRegistry.get(annotation.attachedTo);
      if (!isTtElement(target) || isTtAnnotation(target)) {
        warnings.push({
          message: `Annotation "${annotation.id}" is attached to unknown element "${annotation.attachedTo}"; its connector was dropped.`,
          elementId: annotation.id,
        });
        continue;
      }
      const association = this.factory.createAssociation(source, target);
      association.waypoints = this.connectionDocking.getCroppedWaypoints(association);
      this.canvas.addConnection(association, root);
    }

    this.eventBus.fire("import.render.done", { warnings });
    return warnings;
  }

  /** Removes every element (for re-import). */
  clear(): void {
    const elements = this.elementRegistry.getAll().filter((el) => el.id !== ROOT_ID);
    const connections = elements.filter((el) => "waypoints" in el);
    const shapes = elements.filter((el) => !("waypoints" in el));
    for (const connection of connections) this.canvas.removeConnection(connection.id);
    for (const shape of shapes) {
      try {
        this.canvas.removeShape(shape.id);
      } catch {
        // already removed — ignore
      }
    }
  }
}
