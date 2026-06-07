/**
 * Context-pad actions: rename and delete. Every Team Topologies element is a
 * free shape, so the actions are uniform (no connect — interactions are placed,
 * not wired).
 */

import type ContextPad from "diagram-js/lib/features/context-pad/ContextPad";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type {
  ContextPadEntries,
  default as ContextPadProvider,
} from "diagram-js/lib/features/context-pad/ContextPadProvider";
import type { Element } from "diagram-js/lib/model/Types";
import { isTtElement } from "../model/di-types.js";
import type TtLabelEditing from "../label-editing/TtLabelEditing.js";
import { ICON_DELETE, ICON_EDIT, iconMarkup } from "../draw/icons.js";

function cpHtml(path: string, title: string): string {
  return `<div class="entry tt-cp-entry" title="${title}">${iconMarkup(path)}</div>`;
}

export default class TtContextPadProvider implements ContextPadProvider {
  static $inject = ["contextPad", "modeling", "ttLabelEditing"];

  constructor(
    contextPad: ContextPad,
    private readonly modeling: Modeling,
    private readonly labelEditing: TtLabelEditing,
  ) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: Element): ContextPadEntries {
    if (!isTtElement(element)) return {};
    return {
      "edit-label": {
        group: "edit",
        title: "Rename",
        html: cpHtml(ICON_EDIT, "Rename"),
        action: { click: () => this.labelEditing.activate(element) },
      },
      delete: {
        group: "edit",
        title: "Delete",
        html: cpHtml(ICON_DELETE, "Delete"),
        action: { click: () => this.modeling.removeElements([element]) },
      },
    };
  }
}
