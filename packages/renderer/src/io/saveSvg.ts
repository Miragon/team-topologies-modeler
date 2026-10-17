/**
 * Serialises the current canvas into a standalone SVG (snapshot / export),
 * fitted to the content bounds and independent of the current zoom / scroll.
 * Interaction chrome (selection outlines, resize handles, hover state) is left
 * out, and a white sheet sits behind the diagram, so an export always looks the
 * same as the light canvas, whatever was selected and wherever it is viewed.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import { isTtElement } from "../model/di-types.js";
import { MIRAGON } from "../theme/palette.js";

const MARGIN = 40;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const INTERACTION_CHROME_SELECTOR = [
  ".djs-outline",
  ".djs-resizer",
  ".djs-selection-outline",
  ".djs-lasso-overlay",
  ".djs-dragger",
  ".djs-bendpoint",
  ".djs-segment-dragger",
].join(", ");

const TRANSIENT_CLASSES = ["selected", "hover"];

const CANVAS_ONLY_ATTRIBUTES = ["class", "tabindex", "role", "aria-roledescription", "aria-label"];

export function saveSVG(canvas: Canvas, elementRegistry: ElementRegistry): { svg: string } {
  const container = canvas.getContainer();
  const source = container.querySelector(":scope > svg");
  if (!source) throw new Error("No SVG found in the canvas container.");

  // Content bounds from the team shapes (interactions sit between them).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elementRegistry.getAll()) {
    if (!isTtElement(el)) continue;
    const s = el as unknown as { x: number; y: number; width: number; height: number };
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + s.width);
    maxY = Math.max(maxY, s.y + s.height);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  const x = minX - MARGIN;
  const y = minY - MARGIN;
  const width = maxX - minX + MARGIN * 2;
  const height = maxY - minY + MARGIN * 2;

  const clone = source.cloneNode(true) as SVGSVGElement;
  for (const name of CANVAS_ONLY_ATTRIBUTES) clone.removeAttribute(name);
  for (const node of clone.querySelectorAll(INTERACTION_CHROME_SELECTOR)) node.remove();
  for (const node of clone.querySelectorAll(TRANSIENT_CLASSES.map((name) => `.${name}`).join())) {
    node.classList.remove(...TRANSIENT_CLASSES);
  }

  clone.setAttribute("xmlns", SVG_NAMESPACE);
  clone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  clone.setAttribute("width", String(Math.round(width)));
  clone.setAttribute("height", String(Math.round(height)));

  // Neutralise pan/zoom: let the viewBox (above) drive the geometry.
  const viewport = clone.querySelector<SVGGElement>(".viewport");
  if (viewport) viewport.removeAttribute("transform");

  const sheet = clone.ownerDocument.createElementNS(SVG_NAMESPACE, "rect");
  sheet.setAttribute("class", "tt-export-paper");
  sheet.setAttribute("x", String(x));
  sheet.setAttribute("y", String(y));
  sheet.setAttribute("width", String(width));
  sheet.setAttribute("height", String(height));
  sheet.setAttribute("fill", MIRAGON.weiss);
  clone.insertBefore(sheet, clone.firstChild);

  const svg = new XMLSerializer().serializeToString(clone);
  return { svg: '<?xml version="1.0" encoding="utf-8"?>\n' + svg };
}
