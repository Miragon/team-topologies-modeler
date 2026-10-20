/**
 * Renames the diagram as one undoable command. The title lives on the root element, so a host that
 * listens to the command stack sees the rename like any other change, and undo reverts it.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type CommandHandler from "diagram-js/lib/command/CommandHandler";
import type { ElementLike } from "diagram-js/lib/core/Types";
import type { Root } from "diagram-js/lib/model/Types";
import type { RootBusinessObject } from "../../io/types.js";

type RootWithMeta = Root & { businessObject?: RootBusinessObject };

export interface UpdateTitleContext {
  title: string;
  /** set internally by the handler (for revert). */
  oldTitle?: string;
}

const UNTITLED = "Untitled team topology";

export default class UpdateTitleHandler implements CommandHandler {
  static $inject = ["canvas"];

  constructor(private readonly canvas: Canvas) {}

  execute(context: UpdateTitleContext): ElementLike[] {
    const root = this.canvas.getRootElement() as RootWithMeta;
    const current = root.businessObject ?? { title: UNTITLED };
    context.oldTitle = current.title;
    root.businessObject = { ...current, title: context.title };
    return [root];
  }

  revert(context: UpdateTitleContext): ElementLike[] {
    const root = this.canvas.getRootElement() as RootWithMeta;
    const current = root.businessObject ?? { title: UNTITLED };
    root.businessObject = { ...current, title: context.oldTitle ?? UNTITLED };
    return [root];
  }
}
