/**
 * Keyboard shortcuts of the canvas: undo / redo / select all / delete-selection / copy / paste /
 * nudge the selection with the arrow keys / clear the selection (Escape).
 *
 * Bound to the document so they work right after a click on the canvas, but they only act when the
 * key press targets the page itself or the canvas (diagram-js focuses its SVG on mouse-down). Key
 * presses in host chrome, open dialogs, form fields and the inline label editor stay with those
 * controls, a key a closer listener already handled (`defaultPrevented`) is left alone, and an
 * `inert` canvas takes no keys at all.
 *
 * Zoom and fit keys are the host chrome's (guide §5.8: only Cmd/Ctrl + `+` `-` `0` and Shift+1,
 * each acting exactly once), so the canvas binds none. A host that owns the history (the VS Code
 * document) turns the undo and redo keys off with `undoRedoKeys: false`, so they reach it.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type CommandStack from "diagram-js/lib/command/CommandStack";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type CopyPaste from "diagram-js/lib/features/copy-paste/CopyPaste";
import type Dragging from "diagram-js/lib/features/dragging/Dragging";
import type Rules from "diagram-js/lib/features/rules/Rules";
import type { Injector } from "didi";
import type { Element, Shape } from "diagram-js/lib/model/Types";
import type TtReadOnly from "../read-only/TtReadOnly.js";

const NUDGE_STEP = 1;
const NUDGE_STEP_FAST = 10;

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const MODAL_SELECTOR = '[aria-modal="true"], dialog[open]';

export interface TtKeyboardConfig {
  /**
   * Bind Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y to the canvas command stack (default true).
   * A host that owns the history (the VS Code document) passes false so the keys reach it.
   */
  undoRedoKeys?: boolean | undefined;
}

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

function isNode(target: EventTarget | null): target is Node {
  return typeof (target as Node | null)?.nodeType === "number";
}

function isCanvasScope(target: EventTarget | null, canvasContainer: HTMLElement): boolean {
  // A host marks the canvas inert while something else fronts it, e.g. a start screen.
  if (canvasContainer.closest("[inert]")) return false;
  if (!isNode(target)) return true;
  if (target.nodeType === Node.DOCUMENT_NODE) return true;
  const ownerDocument = target.ownerDocument;
  if (target === ownerDocument?.body || target === ownerDocument?.documentElement) return true;
  return canvasContainer.contains(target);
}

function isShape(element: Element): element is Shape {
  return !("waypoints" in element);
}

export default class TtKeyboard {
  static $inject = [
    "config.ttKeyboard",
    "eventBus",
    "canvas",
    "elementRegistry",
    "commandStack",
    "selection",
    "modeling",
    "copyPaste",
    "rules",
    "injector",
  ];

  constructor(
    config: TtKeyboardConfig | undefined,
    eventBus: EventBus,
    canvas: Canvas,
    elementRegistry: ElementRegistry,
    commandStack: CommandStack,
    selection: Selection,
    modeling: Modeling,
    copyPaste: CopyPaste,
    rules: Rules,
    injector: Injector,
  ) {
    const container = canvas.getContainer();
    const doc = container.ownerDocument ?? document;
    const undoRedoKeys = config?.undoRedoKeys ?? true;
    const dragging = injector.get<Dragging>("dragging", false);
    const readOnly = injector.get<TtReadOnly>("ttReadOnly", false);

    /** Keys that only read the diagram; they stay under the read-only lock. */
    const handleReadingKey = (e: KeyboardEvent, cmd: boolean, key: string): boolean => {
      if (cmd && key === "a" && !e.shiftKey) {
        e.preventDefault();
        selection.select(elementRegistry.filter((element) => Boolean(element.parent)));
      } else if (cmd && key === "c" && !e.shiftKey) {
        const sel = selection.get() as Element[];
        if (!sel.length) return true;
        e.preventDefault();
        copyPaste.copy(sel);
      } else if (!cmd && key === "escape") {
        if (dragging?.context() || !selection.get().length) return true;
        e.preventDefault();
        selection.select(null);
      } else {
        return false;
      }
      return true;
    };

    const handleEditingKey = (e: KeyboardEvent, cmd: boolean, key: string): void => {
      const undo = cmd && key === "z" && !e.shiftKey;
      const redo = (cmd && key === "z" && e.shiftKey) || (cmd && key === "y" && !e.shiftKey);
      if (undo || redo) {
        if (!undoRedoKeys) return;
        e.preventDefault();
        if (undo && commandStack.canUndo()) commandStack.undo();
        if (redo && commandStack.canRedo()) commandStack.redo();
      } else if (key === "delete" || key === "backspace") {
        const sel = selection.get() as Element[];
        if (sel.length) {
          e.preventDefault();
          modeling.removeElements([...sel]);
        }
      } else if (cmd && key === "v" && !e.shiftKey) {
        e.preventDefault();
        copyPaste.paste();
      } else if (!cmd && Object.hasOwn(ARROW_DIRECTIONS, e.key)) {
        const shapes = (selection.get() as Element[]).filter(isShape);
        if (!shapes.length || !rules.allowed("elements.move", { shapes })) return;
        e.preventDefault();
        const direction = ARROW_DIRECTIONS[e.key]!;
        const step = e.shiftKey ? NUDGE_STEP_FAST : NUDGE_STEP;
        modeling.moveElements(shapes, { x: direction.x * step, y: direction.y * step });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.isComposing || isTypingTarget(e.target)) return;
      if (!isCanvasScope(e.target, container) || doc.querySelector(MODAL_SELECTOR)) return;
      const cmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (handleReadingKey(e, cmd, key)) return;
      if (readOnly?.isReadOnly()) return;
      handleEditingKey(e, cmd, key);
    };

    doc.addEventListener("keydown", onKeyDown);
    eventBus.on("diagram.destroy", () => doc.removeEventListener("keydown", onKeyDown));
  }
}
