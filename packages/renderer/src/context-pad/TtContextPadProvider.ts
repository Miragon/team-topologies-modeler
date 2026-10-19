/**
 * Context-pad actions. Teams, interactions and flows: rename, add an attached
 * annotation, delete. Annotations: edit text, connect to an element, delete. An
 * annotation connector: delete. A multi-selection: delete all.
 *
 * Entries are focusable buttons; Enter or Space runs their keyboard action.
 * Connecting has none, because it is a pointer gesture that needs a drop target,
 * so Tab skips it. "Add annotation" on the element attaches one by keyboard.
 *
 * Every entry changes the diagram, so under the read-only lock there is no context pad at all.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
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
import {
  isTtAnnotation,
  isTtAssociation,
  isTtElement,
  isTtFlow,
  isTtInteraction,
  type TtElement,
} from "../model/di-types.js";
import type TtLabelEditing from "../label-editing/TtLabelEditing.js";
import type TtModeling from "../modeling/TtModeling.js";
import { READ_ONLY_CHANGED_EVENT, type TtReadOnly } from "../read-only/index.js";
import {
  ICON_LINK,
  ICON_MESSAGE_SQUARE_PLUS,
  ICON_PENCIL,
  ICON_TRASH,
  iconMarkup,
  type IconNode,
} from "../draw/icons.js";

const ENTRY_SELECTOR = ".djs-context-pad .entry[data-action]";

function cpHtml(icon: IconNode, title: string, focusable = true): string {
  return `<div class="entry tt-cp-entry" role="button" tabindex="${focusable ? 0 : -1}" aria-label="${title}">${iconMarkup(icon)}</div>`;
}

function editTitle(element: TtElement): string {
  if (isTtAnnotation(element)) return "Edit text";
  if (isTtInteraction(element) || isTtFlow(element)) return "Edit label";
  return "Rename";
}

export default class TtContextPadProvider implements ContextPadProvider {
  static $inject = [
    "contextPad",
    "modeling",
    "ttModeling",
    "ttLabelEditing",
    "connect",
    "selection",
    "canvas",
    "eventBus",
    "injector",
  ];

  private readonly readOnly: TtReadOnly | null;

  constructor(
    private readonly contextPad: ContextPad,
    private readonly modeling: Modeling,
    private readonly ttModeling: TtModeling,
    private readonly labelEditing: TtLabelEditing,
    private readonly connect: Connect,
    private readonly selection: Selection,
    private readonly canvas: Canvas,
    eventBus: EventBus,
    injector: { get<T>(name: string, strict?: boolean): T | null },
  ) {
    this.readOnly = injector.get<TtReadOnly>("ttReadOnly", false);
    contextPad.registerProvider(this);
    eventBus.on("contextPad.open.allowed", () => (this.readOnly?.isReadOnly() ? false : undefined));
    eventBus.on(READ_ONLY_CHANGED_EVENT, (event: { readOnly?: boolean }) => {
      if (event.readOnly) contextPad.close();
    });
    canvas
      .getContainer()
      .addEventListener("keydown", (keyboardEvent) => this.onEntryKeyDown(keyboardEvent));
  }

  getContextPadEntries(element: Element): ContextPadEntries {
    if (this.readOnly?.isReadOnly()) return {};
    if (isTtAssociation(element))
      return { delete: this.deleteEntry([element], "Delete connector") };
    if (!isTtElement(element)) return {};

    if (isTtAnnotation(element)) {
      const startConnect = (event: Event) => this.connect.start(event as MouseEvent, element);
      return {
        "edit-label": this.editEntry(element),
        connect: {
          group: "edit",
          title: "Attach to element",
          html: cpHtml(ICON_LINK, "Attach to element", false),
          action: { click: startConnect, dragstart: startConnect },
        },
        delete: this.deleteEntry([element], "Delete"),
      };
    }

    const appendAnnotation = () => {
      const annotation = this.ttModeling.appendAnnotation(element);
      this.selection.select(annotation as unknown as Element);
      this.labelEditing.activate(annotation);
    };
    return {
      "edit-label": this.editEntry(element),
      "append-annotation": {
        group: "edit",
        title: "Add annotation",
        html: cpHtml(ICON_MESSAGE_SQUARE_PLUS, "Add annotation"),
        action: { click: appendAnnotation, keyboard: appendAnnotation },
      },
      delete: this.deleteEntry([element], "Delete"),
    };
  }

  getMultiElementContextPadEntries(elements: Element[]): ContextPadEntries {
    if (this.readOnly?.isReadOnly()) return {};
    return { delete: this.deleteEntry(elements, `Delete ${elements.length} elements`) };
  }

  private onEntryKeyDown(event: KeyboardEvent): void {
    if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
    const entry = (event.target as HTMLElement | null)?.closest?.(ENTRY_SELECTOR);
    const action = entry?.getAttribute("data-action");
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    this.contextPad.triggerEntry(action, "keyboard", event);
  }

  private editEntry(element: TtElement): ContextPadEntry {
    const title = editTitle(element);
    const activate = () => this.labelEditing.activate(element);
    return {
      group: "edit",
      title,
      html: cpHtml(ICON_PENCIL, title),
      action: { click: activate, keyboard: activate },
    };
  }

  private deleteEntry(elements: Element[], title: string): ContextPadEntry {
    return {
      group: "edit",
      title,
      html: cpHtml(ICON_TRASH, title),
      action: {
        click: () => this.modeling.removeElements([...elements]),
        keyboard: () => {
          this.modeling.removeElements([...elements]);
          this.canvas.focus();
        },
      },
    };
  }
}
