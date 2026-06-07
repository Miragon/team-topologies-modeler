/**
 * Inline label editing as an HTML overlay (an <input> centred over the element).
 * Commit goes through `ttModeling.updateLabel` → command stack (undoable).
 * Double-click any element (team / interaction / flow) to (re)label it.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type EventBus from "diagram-js/lib/core/EventBus";
import { isTtElement, type TtElement } from "../model/di-types.js";
import type TtModeling from "../modeling/TtModeling.js";

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
    // Any click/drag/pan outside the input commits (only Escape discards).
    eventBus.on(["element.mousedown", "drag.init", "canvas.viewbox.changing"], () =>
      this.active?.commit(),
    );
  }

  activate(element: TtElement): void {
    this.active?.commit();

    const container = this.canvas.getContainer();
    const scale = this.canvas.zoom();
    const vb = this.canvas.viewbox();
    const cx = element.x + element.width / 2;
    const cy = element.y + element.height / 2;
    const width = 170;
    const left = (cx - vb.x) * scale - width / 2;
    const top = (cy - vb.y) * scale - 14;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "tt-label-input";
    input.value = element.ttLabel ?? "";
    input.style.position = "absolute";
    input.style.left = `${left}px`;
    input.style.top = `${top}px`;
    input.style.width = `${width}px`;
    container.appendChild(input);
    input.focus();
    input.select();

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      input.removeEventListener("keydown", onKey);
      input.removeEventListener("blur", onBlur);
      input.remove();
      this.active = null;
    };
    const commit = () => {
      if (done) return;
      const value = input.value.trim();
      const changed = value !== (element.ttLabel ?? "");
      cleanup();
      if (changed) this.modeling.updateLabel(element, value);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cleanup();
      }
    };
    const onBlur = () => commit();
    input.addEventListener("keydown", onKey);
    input.addEventListener("blur", onBlur);

    this.active = { commit, cleanup };
  }

  cancel(): void {
    this.active?.cleanup();
  }
}
