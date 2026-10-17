/**
 * Keeps the selected element (with its context pad) clear of the inspector panel that edits it,
 * by gliding the canvas out from under the side panel or the bottom sheet.
 */

import { useEffect, useRef, type RefObject } from "react";
import type { Modeler } from "@miragon/team-topologies-renderer";
import type Canvas from "diagram-js/lib/core/Canvas";
import type Dragging from "diagram-js/lib/features/dragging/Dragging";

/** Space kept between the selection (with its context pad) and the panel or the canvas edge. */
const CLEARANCE = 16;
/** diagram-js places the context pad this many diagram units to the right of the element. */
const CONTEXT_PAD_MARGIN = 8;
const CONTEXT_PAD_FALLBACK_WIDTH = 40;
/** On narrow screens the palette takes the second row; the selection is never pushed under it. */
const NARROW_TOP_CLEARANCE = 112;
const LABEL_EDITOR_SELECTOR = "textarea.tt-label-editor";
/** Matches --cd-motion-base. */
const PAN_DURATION_MS = 250;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * What the panel keeps clear, in diagram units: one element, or the bounds of a multi-selection
 * (whose context pad diagram-js places beside those bounds). The id says when it is a new target.
 */
export interface SelectionArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pans by a screen-pixel delta, gliding unless the user asked for reduced motion. */
function glideCanvas(canvas: Canvas, dx: number, dy: number): () => void {
  if (prefersReducedMotion()) {
    canvas.scroll({ dx, dy });
    return () => undefined;
  }
  const start = performance.now();
  let moved = { x: 0, y: 0 };
  let frame = 0;
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / PAN_DURATION_MS);
    const eased = 1 - Math.pow(1 - progress, 3);
    const next = { x: dx * eased, y: dy * eased };
    canvas.scroll({ dx: next.x - moved.x, dy: next.y - moved.y });
    moved = next;
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
}

/** The shift that moves [start, end] inside [min, max]; when it can't fit, the start stays visible. */
export function shiftInto(start: number, end: number, min: number, max: number): number {
  if (end > max) return Math.max(max - end, min - start);
  if (start < min) return Math.min(min - start, max - end);
  return 0;
}

/**
 * The screen-pixel pan that moves the element and its context pad out from under the panel: to the
 * left of the side panel, or into the strip between the palette and the bottom sheet (which also
 * brings a context pad back from beyond the right edge of a phone screen).
 */
function panOutFromUnder(canvas: Canvas, element: SelectionArea, panel: HTMLElement) {
  const container = canvas.getContainer().getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const viewbox = canvas.viewbox();
  const scale = viewbox.scale;

  const left = container.left + (element.x - viewbox.x) * scale;
  const top = container.top + (element.y - viewbox.y) * scale;
  const pad = canvas.getContainer().querySelector<HTMLElement>(".djs-context-pad");
  const padWidth = pad?.offsetWidth || CONTEXT_PAD_FALLBACK_WIDTH;
  const padHeight = pad?.offsetHeight ?? 0;
  const right = left + element.width * scale + CONTEXT_PAD_MARGIN * scale + padWidth;
  const bottom = Math.max(top + element.height * scale, top + padHeight);

  const isBottomSheet = panelRect.width > container.width * 0.6;
  if (isBottomSheet) {
    return {
      dx: shiftInto(left, right, container.left + CLEARANCE, container.right - CLEARANCE),
      dy: shiftInto(top, bottom, container.top + NARROW_TOP_CLEARANCE, panelRect.top - CLEARANCE),
    };
  }

  const overlaps =
    right > panelRect.left &&
    left < panelRect.right &&
    bottom > panelRect.top &&
    top < panelRect.bottom;
  if (!overlaps) return { dx: 0, dy: 0 };
  const dx = shiftInto(left, right, container.left + CLEARANCE, panelRect.left - CLEARANCE);
  return { dx: Math.min(0, dx), dy: 0 };
}

function whenRemoved(node: Element, callback: () => void): () => void {
  const parent = node.parentNode;
  if (!parent) {
    callback();
    return () => undefined;
  }
  const observer = new MutationObserver(() => {
    if (node.isConnected) return;
    observer.disconnect();
    callback();
  });
  observer.observe(parent, { childList: true });
  return () => observer.disconnect();
}

/**
 * Keeps the selected element clear of the panel that edits it. It waits until the pointer is
 * released, so a press that starts a drag never moves the canvas under the cursor.
 */
export function useKeepSelectionVisible(
  modeler: Modeler,
  element: SelectionArea | null,
  panelRef: RefObject<HTMLElement | null>,
) {
  const pointerDown = useRef(false);

  useEffect(() => {
    const press = () => (pointerDown.current = true);
    const release = () => (pointerDown.current = false);
    window.addEventListener("pointerdown", press, true);
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    return () => {
      window.removeEventListener("pointerdown", press, true);
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
    };
  }, []);

  const elementId = element?.id;
  useEffect(() => {
    if (!element) return;
    let frame = 0;
    let stopGlide: () => void = () => undefined;
    let stopWaiting: () => void = () => undefined;

    const panIfCovered = () => {
      frame = requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel || modeler.get<Dragging>("dragging").context()) return;
        const canvas = modeler.get<Canvas>("canvas");
        // Any pan commits an open label editor, so the pan waits until typing is done.
        const labelEditor = canvas.getContainer().querySelector(LABEL_EDITOR_SELECTOR);
        if (labelEditor) {
          stopWaiting = whenRemoved(labelEditor, panIfCovered);
          return;
        }
        const { dx, dy } = panOutFromUnder(canvas, element, panel);
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) stopGlide = glideCanvas(canvas, dx, dy);
      });
    };
    const interrupt = () => stopGlide();

    if (pointerDown.current) window.addEventListener("pointerup", panIfCovered, { once: true });
    else panIfCovered();
    window.addEventListener("pointerdown", interrupt, true);
    window.addEventListener("wheel", interrupt, { capture: true, passive: true });

    return () => {
      cancelAnimationFrame(frame);
      stopGlide();
      stopWaiting();
      window.removeEventListener("pointerup", panIfCovered);
      window.removeEventListener("pointerdown", interrupt, true);
      window.removeEventListener("wheel", interrupt, true);
    };
    // Re-running for every new object of the same target (each model revision) would re-pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeler, elementId, panelRef]);
}
