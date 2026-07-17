/**
 * Allowed editing operations. Every Team Topologies element is a free, placed
 * shape — movable, creatable and resizable. There are no connections (the
 * official notation models interactions as overlapping shapes, not lines).
 */

import RuleProvider from "diagram-js/lib/features/rules/RuleProvider";
import type EventBus from "diagram-js/lib/core/EventBus";

interface MoveContext {
  target?: { parent?: unknown } | null;
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
  }
}
