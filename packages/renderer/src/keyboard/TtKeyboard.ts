/**
 * Keyboard shortcuts: undo / redo / select all / delete-selection / copy /
 * paste / nudge the selection with the arrow keys / clear the selection
 * (Escape) / zoom in and out (+, -) / fit to view (Shift+1) / 100 % (Shift+0).
 *
 * Bound to the document so they work right after a click on the canvas, but
 * they only act when the key press targets the page itself or the canvas
 * (diagram-js focuses its SVG on mouse-down). Key presses in host chrome, open
 * dialogs, form fields and the inline label editor stay with those controls,
 * and an `inert` canvas takes no keys at all. The zoom keys take no Ctrl/Cmd,
 * so the browser's own page zoom stays intact.
 */

import type { Injector } from "didi";
import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type CommandStack from "diagram-js/lib/command/CommandStack";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type CopyPaste from "diagram-js/lib/features/copy-paste/CopyPaste";
import type Dragging from "diagram-js/lib/features/dragging/Dragging";
import type Rules from "diagram-js/lib/features/rules/Rules";
import type ZoomScroll from "diagram-js/lib/navigation/zoomscroll/ZoomScroll";
import type { Element, Shape } from "diagram-js/lib/model/Types";
import type TtViewport from "../io/TtViewport.js";

const NUDGE_STEP = 1;
const NUDGE_STEP_FAST = 10;
/** Zoom factor per key press when diagram-js zoomScroll (with its stepped levels) is absent. */
const FALLBACK_ZOOM_FACTOR = 1.2;

const ARROW_DIRECTIONS: Record<string, { x: number; y: number }> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

const MODAL_SELECTOR = '[aria-modal="true"], dialog[open]';

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
    const zoomScroll = injector.get<ZoomScroll>("zoomScroll", false);
    const viewport = injector.get<TtViewport>("ttViewport", false);
    const dragging = injector.get<Dragging>("dragging", false);

    const stepZoom = (direction: 1 | -1) => {
      if (zoomScroll) zoomScroll.stepZoom(direction);
      else canvas.zoom(canvas.zoom() * FALLBACK_ZOOM_FACTOR ** direction);
    };

    const fitToView = () => {
      if (viewport) viewport.fit();
      else canvas.zoom("fit-viewport");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target)) return;
      if (!isCanvasScope(e.target, container) || doc.querySelector(MODAL_SELECTOR)) return;
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
      } else if (cmd || e.altKey) {
        return;
      } else if (key === "escape") {
        if (dragging?.context() || !selection.get().length) return;
        e.preventDefault();
        selection.select(null);
      } else if (e.shiftKey && e.code === "Digit1") {
        e.preventDefault();
        fitToView();
      } else if (e.shiftKey && e.code === "Digit0") {
        e.preventDefault();
        canvas.zoom(1);
      } else if (key === "+" || key === "=") {
        e.preventDefault();
        stepZoom(1);
      } else if (key === "-") {
        e.preventDefault();
        stepZoom(-1);
      } else if (Object.hasOwn(ARROW_DIRECTIONS, e.key)) {
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
