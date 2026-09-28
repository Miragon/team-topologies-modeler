/**
 * Allowed editing operations. Every Team Topologies element is a free, placed
 * shape — movable, creatable and resizable. The only connection is an
 * annotation's connector to a team, interaction or flow (the official notation
 * models interactions as overlapping shapes, not lines).
 */

import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";
import type EventBus from "diagram-js/lib/core/EventBus";
import { isTtAnnotation, isTtElement } from "../model/di-types.js";

interface MoveContext {
  target?: { parent?: unknown } | null;
}

interface ConnectContext {
  source?: unknown;
  target?: unknown;
}

function isAttachable(element: unknown): boolean {
  return isTtElement(element) && !isTtAnnotation(element);
}

export default class TtRules extends RuleProvider {
  static override $inject = ["eventBus"];

  constructor(eventBus: EventBus) {
    super(eventBus);
  }

  override init(): void {
    this.addRule(["shape.move", "elements.move"], (context: MoveContext) =>
      context.target && context.target.parent ? null : true,
    );
    this.addRule("shape.create", () => true);
    this.addRule("shape.resize", () => true);
    this.addRule("element.copy", () => true);
    this.addRule("connection.create", ({ source, target }: ConnectContext) =>
      (isTtAnnotation(source) && isAttachable(target)) ||
      (isTtAnnotation(target) && isAttachable(source))
        ? { ttKind: "association" }
        : false,
    );
  }
}
