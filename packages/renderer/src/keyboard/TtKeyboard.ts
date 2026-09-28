/**
 * Keyboard shortcuts: undo / redo / select all / delete-selection / copy /
 * paste / nudge the selection with the arrow keys. Bound to the document so they
 * work without first clicking (focusing) the canvas — typing inside form fields
 * (and the inline label editor) is left untouched. No container `tabindex`, so
 * the canvas never shows a focus ring.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type CommandStack from "diagram-js/lib/command/CommandStack";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type CopyPaste from "diagram-js/lib/features/copy-paste/CopyPaste";
import type Rules from "diagram-js/lib/features/rules/Rules";
import type { Element, Shape } from "diagram-js/lib/model/Types";

const NUDGE_STEP = 1;
const NUDGE_STEP_FAST = 10;

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

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

function isShape(element: Element): element is Shape {
  return !("waypoints" in element);
}

export default class TtKeyboard {
  static $inject = [
    "eventBus",
    "canvas",
    "elementRegistry",
    "commandStack",
    "selection",
    "modeling",
    "copyPaste",
    "rules",
  ];

  constructor(
    eventBus: EventBus,
    canvas: Canvas,
    elementRegistry: ElementRegistry,
    commandStack: CommandStack,
    selection: Selection,
    modeling: Modeling,
    copyPaste: CopyPaste,
    rules: Rules,
  ) {
    const doc = canvas.getContainer().ownerDocument ?? document;

    const onKeyDown = (e: KeyboardEvent) => {
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
      } else if (cmd && key === "a") {
        e.preventDefault();
        selection.select(elementRegistry.filter((element) => Boolean(element.parent)));
      } else if (!cmd && !e.altKey && Object.hasOwn(ARROW_DIRECTIONS, e.key)) {
        const shapes = (selection.get() as Element[]).filter(isShape);
        if (!shapes.length || !rules.allowed("elements.move", { shapes })) return;
        e.preventDefault();
        const direction = ARROW_DIRECTIONS[e.key];
        const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
        modeling.moveElements(shapes, { x: direction.x * step, y: direction.y * step });
      }
    };

    doc.addEventListener("keydown", onKeyDown);
    eventBus.on("diagram.destroy", () => doc.removeEventListener("keydown", onKeyDown));
  }
}
