/**
 * Enforces a fixed stacking order regardless of creation order, by reordering
 * the element graphics within the canvas layer. Back → front:
 *
 *   flow  <  stream-aligned / platform  <  complicated-subsystem  <  enabling
 *         <  interactions  <  annotations  <  annotation connectors
 *
 * So interaction glyphs always read on top of teams; enabling teams sit above the
 * complicated-subsystem teams, which in turn sit above the stream-aligned /
 * platform base teams they overlap. Annotation connectors come last so no shape
 * they cross on the way to their element hides them.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import {
  isTtAnnotation,
  isTtAssociation,
  isTtElement,
  isTtFlow,
  isTtInteraction,
  isTtTeam,
  type TtAssociation,
  type TtElement,
} from "../model/di-types.js";

/** Lower = further back. */
function tier(el: TtElement | TtAssociation): number {
  if (isTtFlow(el)) return 0;
  if (isTtTeam(el)) {
    if (el.teamType === "enabling") return 3;
    if (el.teamType === "complicated-subsystem") return 2;
    return 1; // stream-aligned, platform
  }
  if (isTtInteraction(el)) return 4;
  if (isTtAnnotation(el)) return 5;
  if (isTtAssociation(el)) return 6;
  return 1;
}

function isOrdered(el: unknown): el is TtElement | TtAssociation {
  return isTtElement(el) || isTtAssociation(el);
}

export default class TtZOrder {
  static $inject = ["eventBus", "canvas", "elementRegistry"];

  private importing = false;

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry,
  ) {
    eventBus.on("import.render.start", () => {
      this.importing = true;
    });
    eventBus.on("import.render.done", () => {
      this.importing = false;
      this.reorder();
    });
    // Covers create + team-type changes (and harmlessly re-runs on move/resize).
    eventBus.on("commandStack.changed", () => {
      if (!this.importing) this.reorder();
    });
  }

  /** Re-append each element's graphics group in ascending tier order (back → front). */
  reorder(): void {
    const ordered = this.elementRegistry
      .getAll()
      .filter(isOrdered)
      .sort((a, b) => tier(a) - tier(b));
    for (const el of ordered) {
      const gfx = this.canvas.getGraphics(el) as SVGElement | undefined;
      const wrapper = gfx?.parentNode as (Node & ChildNode) | null;
      const layer = wrapper?.parentNode as (Node & { appendChild(n: Node): Node }) | null;
      if (wrapper && layer) layer.appendChild(wrapper);
    }
  }
}
