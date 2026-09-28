/**
 * Context-pad actions. Teams, interactions and flows: rename, add an attached
 * annotation, delete. Annotations: edit text, connect to an element, delete. An
 * annotation connector: delete. A multi-selection: delete all.
 */

import type ContextPad from "diagram-js/lib/features/context-pad/ContextPad";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type Connect from "diagram-js/lib/features/connect/Connect";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type {
  ContextPadEntries,
  ContextPadEntry,
  default as ContextPadProvider,
} from "diagram-js/lib/features/context-pad/ContextPadProvider";
import type { Element } from "diagram-js/lib/model/Types";
import { isTtAnnotation, isTtAssociation, isTtElement, type TtElement } from "../model/di-types.js";
import type TtLabelEditing from "../label-editing/TtLabelEditing.js";
import type TtModeling from "../modeling/TtModeling.js";
import { ICON_ANNOTATION, ICON_DELETE, ICON_EDIT, ICON_LINK, iconMarkup } from "../draw/icons.js";

function cpHtml(path: string, title: string): string {
  return `<div class="entry tt-cp-entry" title="${title}">${iconMarkup(path)}</div>`;
}

export default class TtContextPadProvider implements ContextPadProvider {
  static $inject = [
    "contextPad",
    "modeling",
    "ttModeling",
    "ttLabelEditing",
    "connect",
    "selection",
  ];

  constructor(
    contextPad: ContextPad,
    private readonly modeling: Modeling,
    private readonly ttModeling: TtModeling,
    private readonly labelEditing: TtLabelEditing,
    private readonly connect: Connect,
    private readonly selection: Selection,
  ) {
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: Element): ContextPadEntries {
    if (isTtAssociation(element))
      return { delete: this.deleteEntry([element], "Remove connector") };
    if (!isTtElement(element)) return {};

    if (isTtAnnotation(element)) {
      const startConnect = (event: Event) => this.connect.start(event as MouseEvent, element);
      return {
        "edit-label": this.editEntry(element, "Edit text"),
        connect: {
          group: "edit",
          title: "Attach to an element",
          html: cpHtml(ICON_LINK, "Attach to an element"),
          action: { click: startConnect, dragstart: startConnect },
        },
        delete: this.deleteEntry([element], "Delete"),
      };
    }

    return {
      "edit-label": this.editEntry(element, "Rename"),
      "append-annotation": {
        group: "edit",
        title: "Add annotation",
        html: cpHtml(ICON_ANNOTATION, "Add annotation"),
        action: {
          click: () => {
            const annotation = this.ttModeling.appendAnnotation(element);
            this.selection.select(annotation as unknown as Element);
            this.labelEditing.activate(annotation);
          },
        },
      },
      delete: this.deleteEntry([element], "Delete"),
    };
  }

  getMultiElementContextPadEntries(elements: Element[]): ContextPadEntries {
    return { delete: this.deleteEntry(elements, `Delete ${elements.length} elements`) };
  }

  private editEntry(element: TtElement, title: string): ContextPadEntry {
    return {
      group: "edit",
      title,
      html: cpHtml(ICON_EDIT, title),
      action: { click: () => this.labelEditing.activate(element) },
    };
  }

  private deleteEntry(elements: Element[], title: string): ContextPadEntry {
    return {
      group: "edit",
      title,
      html: cpHtml(ICON_DELETE, title),
      action: { click: () => this.modeling.removeElements([...elements]) },
    };
  }
}
