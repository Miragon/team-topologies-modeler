/**
 * Serialises the current canvas into a standalone SVG (snapshot / export),
 * fitted to the content bounds and independent of the current zoom / scroll.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import { isTtElement } from "../model/di-types.js";

const MARGIN = 40;

export function saveSVG(canvas: Canvas, elementRegistry: ElementRegistry): { svg: string } {
  const container = canvas.getContainer();
  const source = container.querySelector("svg");
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
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  clone.setAttribute("width", String(Math.round(width)));
  clone.setAttribute("height", String(Math.round(height)));

  // Neutralise pan/zoom: let the viewBox (above) drive the geometry.
  const viewport = clone.querySelector<SVGGElement>(".viewport");
  if (viewport) viewport.removeAttribute("transform");

  const svg = new XMLSerializer().serializeToString(clone);
  return { svg: '<?xml version="1.0" encoding="utf-8"?>\n' + svg };
}
