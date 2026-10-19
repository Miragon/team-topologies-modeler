/**
 * In-place label editing: a borderless, transparent <textarea> laid exactly over
 * the element's label area, in the label's own font, size, alignment and
 * wrapping, scaled with the zoom. The rendered label is hidden meanwhile, so the
 * text never shows twice. Enter (or clicking elsewhere) commits through
 * `ttModeling.updateLabel` — one undo step; Shift+Enter inserts a line break;
 * Escape discards. Double-click any element to edit its label.
 *
 * An import replaces every element, so an edit open while one runs is taken down without a commit
 * and reopened, with what was typed, on the element with the same id (hosts re-import remote
 * states while the user types). Under the read-only lock no editor opens.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import {
  isTtAnnotation,
  isTtElement,
  isTtFlow,
  isTtInteraction,
  type TtElement,
} from "../model/di-types.js";
import type TtModeling from "../modeling/TtModeling.js";
import { READ_ONLY_CHANGED_EVENT, type TtReadOnly } from "../read-only/index.js";
import { LINE_HEIGHT, labelLayout } from "../draw/label-layout.js";
import { FONT } from "../draw/styles.js";

/** Canvas marker that hides the rendered label while its editor is open. */
const EDITING_MARKER = "tt-label-editing";

/** Narrow shapes (small interaction glyphs) still get an editor wide enough to type in. */
const MIN_EDITOR_WIDTH = 96;

function editorName(element: TtElement): string {
  if (isTtAnnotation(element)) return "Annotation text";
  if (isTtInteraction(element)) return "Interaction label";
  if (isTtFlow(element)) return "Flow label";
  return "Team name";
}

interface ActiveEdit {
  commit: () => void;
  cleanup: () => void;
  /** The element and what was typed so far, to reopen the edit after an import. */
  snapshot: () => SuspendedEdit;
}

interface SuspendedEdit {
  elementId: string;
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export default class TtLabelEditing {
  static $inject = ["eventBus", "canvas", "ttModeling", "elementRegistry", "injector"];

  private active: ActiveEdit | null = null;
  private suspended: SuspendedEdit | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly readOnly: TtReadOnly | null;

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly modeling: TtModeling,
    private readonly elementRegistry: ElementRegistry,
    injector: { get<T>(name: string, strict?: boolean): T | null },
  ) {
    this.readOnly = injector.get<TtReadOnly>("ttReadOnly", false);
    eventBus.on("element.dblclick", (event: { element?: unknown }) => {
      if (isTtElement(event.element)) this.activate(event.element);
    });
    // Any click/drag/pan outside the editor commits (only Escape discards).
    eventBus.on(["element.mousedown", "drag.init", "canvas.viewbox.changing"], () =>
      this.active?.commit(),
    );
    // An import that bypasses suspend() still must not apply a pending edit to a removed element.
    eventBus.on("import.render.start", () => this.cancel());
    eventBus.on(READ_ONLY_CHANGED_EVENT, (event: { readOnly?: boolean }) => {
      if (event.readOnly) this.cancel();
    });
    // Before the canvas tears down: a field still open would blur, commit onto the destroyed
    // diagram and queue a focus on it.
    eventBus.on("diagram.destroy", () => {
      clearTimeout(this.resumeTimer);
      this.suspended = null;
      this.cancel();
    });
  }

  /**
   * Takes an open edit down WITHOUT committing it, for an import that replaces the diagram: its
   * element is about to go, so a commit would land on a removed shape. `resumeAfterImport` brings
   * the editor back with the typed text.
   */
  suspend(): void {
    clearTimeout(this.resumeTimer);
    if (!this.active) return;
    this.suspended = this.active.snapshot();
    this.active.cleanup();
  }

  /**
   * Reopens a suspended edit on the element with the same id, if the imported diagram still has
   * it. Deferred to the next task, after the host restored its viewbox around the import (a
   * viewbox change commits an open editor).
   */
  resumeAfterImport(): void {
    clearTimeout(this.resumeTimer);
    if (!this.suspended) return;
    this.resumeTimer = setTimeout(() => {
      const edit = this.suspended;
      this.suspended = null;
      if (!edit || this.active) return;
      const element = this.elementRegistry.get(edit.elementId);
      if (!isTtElement(element)) return;
      this.activate(element, edit);
    }, 0);
  }

  /** The edit open right now (its element and the uncommitted text), for hosts and tests. */
  openEdit(): { elementId: string; value: string } | undefined {
    if (!this.active) return undefined;
    const { elementId, value } = this.active.snapshot();
    return { elementId, value };
  }

  activate(element: TtElement, resumed?: SuspendedEdit): void {
    this.active?.commit();
    if (this.readOnly?.isReadOnly()) return;

    const layout = labelLayout(element);
    const centred = layout.align === "center";
    const scale = this.canvas.zoom();
    const viewbox = this.canvas.viewbox();

    const width = centred ? Math.max(layout.box.width, MIN_EDITOR_WIDTH) : layout.box.width;
    const left = element.x + layout.box.x + (layout.box.width - width) / 2;
    const top = (element.y + layout.box.y - viewbox.y) * scale;
    const boxHeight = layout.box.height * scale;

    const editor = document.createElement("textarea");
    editor.className = "tt-label-editor";
    editor.value = resumed ? resumed.value : (element.ttLabel ?? "");
    editor.rows = 1;
    editor.setAttribute("aria-label", editorName(element));
    Object.assign(editor.style, {
      left: `${(left - viewbox.x) * scale}px`,
      width: `${width * scale}px`,
      fontFamily: FONT.family,
      fontSize: `${layout.fontSize * scale}px`,
      fontWeight: layout.fontWeight,
      letterSpacing: layout.letterSpacing ?? "normal",
      lineHeight: String(LINE_HEIGHT),
      color: layout.fill,
      textAlign: centred ? "center" : "left",
    });

    // Grow with the text; centred labels stay vertically centred like the rendered ones.
    const fitToContent = () => {
      editor.style.height = "0px";
      const contentHeight = editor.scrollHeight;
      editor.style.height = `${centred ? contentHeight : Math.max(contentHeight, boxHeight)}px`;
      editor.style.top = `${centred ? top + (boxHeight - contentHeight) / 2 : top}px`;
    };

    this.canvas.getContainer().appendChild(editor);
    this.canvas.addMarker(element, EDITING_MARKER);
    fitToContent();
    editor.focus();
    if (resumed) editor.setSelectionRange(resumed.selectionStart, resumed.selectionEnd);
    else editor.select();

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      editor.removeEventListener("keydown", onKey);
      editor.removeEventListener("input", fitToContent);
      editor.removeEventListener("blur", onBlur);
      editor.remove();
      if (this.elementRegistry.get(element.id) === element) {
        this.canvas.removeMarker(element, EDITING_MARKER);
      }
      this.active = null;
      // Removing the focused field drops the focus to the page; the canvas takes it back.
      this.canvas.restoreFocus();
    };
    const commit = () => {
      if (done) return;
      const value = editor.value.trim();
      const changed = value !== (element.ttLabel ?? "");
      cleanup();
      if (changed) this.modeling.updateLabel(element, value);
    };
    // Removing the focused editor would drop focus to the page; keep keyboard users on the canvas.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        commit();
        this.canvas.focus();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
        this.canvas.focus();
      }
    };
    const onBlur = () => commit();
    editor.addEventListener("keydown", onKey);
    editor.addEventListener("input", fitToContent);
    editor.addEventListener("blur", onBlur);

    const snapshot = (): SuspendedEdit => ({
      elementId: element.id,
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
    });
    this.active = { commit, cleanup, snapshot };
  }

  cancel(): void {
    this.active?.cleanup();
  }
}
