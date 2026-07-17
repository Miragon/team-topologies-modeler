/**
 * Keyboard shortcuts: undo / redo / delete-selection / copy / paste. Bound to
 * the document so they work without first clicking (focusing) the canvas —
 * typing inside form fields is left untouched. No container `tabindex`, so the
 * canvas never shows a focus ring.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type CommandStack from "diagram-js/lib/command/CommandStack";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type CopyPaste from "diagram-js/lib/features/copy-paste/CopyPaste";
import type { Element } from "diagram-js/lib/model/Types";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

export default class TtKeyboard {
  static $inject = ["canvas", "commandStack", "selection", "modeling", "copyPaste"];

  constructor(
    canvas: Canvas,
    commandStack: CommandStack,
    selection: Selection,
    modeling: Modeling,
    copyPaste: CopyPaste,
  ) {
    const doc = canvas.getContainer().ownerDocument ?? document;

    doc.addEventListener("keydown", (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const cmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (cmd && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (commandStack.canUndo()) commandStack.undo();
      } else if ((cmd && key === "z" && e.shiftKey) || (cmd && key === "y")) {
        e.preventDefault();
        if (commandStack.canRedo()) commandStack.redo();
      } else if (key === "delete" || key === "backspace") {
        const sel = selection.get() as Element[];
        if (sel.length) {
          e.preventDefault();
          modeling.removeElements([...sel]);
        }
      } else if (cmd && key === "c") {
        const sel = selection.get() as Element[];
        if (sel.length) {
          e.preventDefault();
          copyPaste.copy(sel);
        }
      } else if (cmd && key === "v") {
        e.preventDefault();
        copyPaste.paste();
      }
    });
  }
}
