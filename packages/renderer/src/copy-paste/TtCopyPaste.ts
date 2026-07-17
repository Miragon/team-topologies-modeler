/**
 * Copy-paste for Team Topologies shapes, built on the stock diagram-js
 * CopyPaste feature. Only the id handling differs: the stock `createShape`
 * drops the descriptor id and lets diagram-js auto-assign a `shape_N` id, which
 * is the very collision hazard `TtElementFactory` avoids (its counter is not
 * advanced past ids that arrive via import). So we mint a fresh, scheme-correct
 * `team_/int_/flow_` id instead — the custom `tt*` props are already on the
 * descriptor (added by `TtCopyPasteProps`) and pass straight through.
 */

import CopyPaste from "diagram-js/lib/features/copy-paste/CopyPaste.js";
import { newId } from "@miragon/team-topologies-schema-model";

import type Canvas from "diagram-js/lib/core/Canvas";
import type Create from "diagram-js/lib/features/create/Create";
import type Clipboard from "diagram-js/lib/features/clipboard/Clipboard";
import type ElementFactory from "diagram-js/lib/core/ElementFactory";
import type EventBus from "diagram-js/lib/core/EventBus";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type Mouse from "diagram-js/lib/features/mouse/Mouse";
import type Rules from "diagram-js/lib/features/rules/Rules";
import type { Shape } from "diagram-js/lib/model/Types";

/** Maps a `ttKind` to the id prefix the model package's factory uses. */
function pasteIdPrefix(ttKind: unknown): string | undefined {
  switch (ttKind) {
    case "team":
      return "team";
    case "interaction":
      return "int";
    case "flow":
      return "flow";
    default:
      return undefined;
  }
}

export default class TtCopyPaste extends CopyPaste {
  static override $inject = [
    "canvas",
    "create",
    "clipboard",
    "elementFactory",
    "eventBus",
    "modeling",
    "mouse",
    "rules",
  ];

  constructor(
    canvas: Canvas,
    create: Create,
    clipboard: Clipboard,
    private readonly elementFactory: ElementFactory,
    eventBus: EventBus,
    modeling: Modeling,
    mouse: Mouse,
    rules: Rules,
  ) {
    super(canvas, create, clipboard, elementFactory, eventBus, modeling, mouse, rules);
  }

  override createShape(attrs: Record<string, unknown>): Shape {
    const prefix = pasteIdPrefix(attrs.ttKind);
    if (!prefix) {
      return super.createShape(attrs);
    }
    // Keep the id (unlike stock `createShape`, which strips it): a fresh
    // model-style id avoids "element already exists" on the next create.
    return this.elementFactory.createShape({ ...attrs, id: newId(prefix) }) as Shape;
  }
}
