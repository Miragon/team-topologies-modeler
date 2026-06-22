/**
 * Bridges the canonical `TtDocument` into the diagram-js canvas. Everything is a
 * shape; stacking order (back → front) is flows, teams, interactions, so the
 * translucent interaction glyphs read on top of the team boxes they overlay.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementFactory from "diagram-js/lib/core/ElementFactory";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import type { Root } from "diagram-js/lib/model/Types";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import type TtElementFactory from "../model/TtElementFactory.js";
import { ROOT_ID, type ImportWarning, type RootBusinessObject } from "./types.js";

type RootWithMeta = Root & { businessObject?: RootBusinessObject };

export default class TtImporter {
  static $inject = ["canvas", "elementFactory", "ttElementFactory", "eventBus", "elementRegistry"];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementFactory: ElementFactory,
    private readonly factory: TtElementFactory,
    private readonly eventBus: EventBus,
    private readonly elementRegistry: ElementRegistry,
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

    // Back → front: flows, teams, interactions.
    for (const flow of doc.flows) {
      this.canvas.addShape(this.factory.createFlow(flow), root);
    }
    for (const node of doc.nodes) {
      this.canvas.addShape(this.factory.createTeam(node), root);
    }
    for (const interaction of doc.interactions) {
      this.canvas.addShape(this.factory.createInteraction(interaction), root);
    }

    this.eventBus.fire("import.render.done", { warnings });
    return warnings;
  }

  /** Removes every element (for re-import). */
  clear(): void {
    for (const el of [...this.elementRegistry.getAll()]) {
      if (el.id === ROOT_ID) continue;
      try {
        this.canvas.removeShape(el.id);
      } catch {
        // already removed — ignore
      }
    }
  }
}
