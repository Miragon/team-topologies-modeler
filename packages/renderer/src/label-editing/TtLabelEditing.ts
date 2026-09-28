/**
 * In-place label editing: a borderless, transparent <textarea> laid exactly over
 * the element's label area, in the label's own font, size, alignment and
 * wrapping, scaled with the zoom. The rendered label is hidden meanwhile, so the
 * text never shows twice. Enter (or clicking elsewhere) commits through
 * `ttModeling.updateLabel` — one undo step; Shift+Enter inserts a line break;
 * Escape discards. Double-click any element to edit its label.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import { isTtAnnotation, isTtElement, type TtElement } from "../model/di-types.js";
import type TtModeling from "../modeling/TtModeling.js";
import { LINE_HEIGHT, labelLayout } from "../draw/label-layout.js";
import { FONT } from "../draw/styles.js";

/** Canvas marker that hides the rendered label while its editor is open. */
const EDITING_MARKER = "tt-label-editing";

/** Narrow shapes (small interaction glyphs) still get an editor wide enough to type in. */
const MIN_EDITOR_WIDTH = 96;

interface ActiveEdit {
  commit: () => void;
  cleanup: () => void;
}

export default class TtLabelEditing {
  static $inject = ["eventBus", "canvas", "ttModeling"];

  private active: ActiveEdit | null = null;

  constructor(
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly modeling: TtModeling,
  ) {
    eventBus.on("element.dblclick", (event: { element?: unknown }) => {
      if (isTtElement(event.element)) this.activate(event.element);
    });
    // Any click/drag/pan outside the editor commits (only Escape discards).
    eventBus.on(["element.mousedown", "drag.init", "canvas.viewbox.changing"], () =>
      this.active?.commit(),
    );
    // A re-import replaces every element, so a pending edit has nothing left to apply to.
    eventBus.on("import.render.start", () => this.cancel());
  }

  activate(element: TtElement): void {
    this.active?.commit();

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
    editor.value = element.ttLabel ?? "";
    editor.rows = 1;
    editor.setAttribute("aria-label", isTtAnnotation(element) ? "Annotation text" : "Label");
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
    editor.select();

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      editor.removeEventListener("keydown", onKey);
      editor.removeEventListener("input", fitToContent);
      editor.removeEventListener("blur", onBlur);
      editor.remove();
      this.canvas.removeMarker(element, EDITING_MARKER);
      this.active = null;
    };
    const commit = () => {
      if (done) return;
      const value = editor.value.trim();
      const changed = value !== (element.ttLabel ?? "");
      cleanup();
      if (changed) this.modeling.updateLabel(element, value);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
      }
    };
    const onBlur = () => commit();
    editor.addEventListener("keydown", onKey);
    editor.addEventListener("input", fitToContent);
    editor.addEventListener("blur", onBlur);

    this.active = { commit, cleanup };
  }

  cancel(): void {
    this.active?.cleanup();
  }
}
