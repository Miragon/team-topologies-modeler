/**
 * The box around the diagram's content, which a host fits its view to, and the renderer's own fit
 * for hosts without chrome that fits (unlike diagram-js `fit-viewport`, it keeps the strip under the
 * floating palette free, so no element starts hidden behind it).
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import { labelTextBox } from "../draw/label-layout.js";
import { isTtElement } from "../model/di-types.js";

/** Up to this container width the palette sits on its own row below the host's top chrome. */
const NARROW_LAYOUT_MAX_WIDTH = 760;

const TOP_INSET = 88;
const TOP_INSET_NARROW = 120;
const PADDING = 56;
const SIDE_PADDING_NARROW = 24;
/** Guide §5.9: a fit never zooms past 100 %, as the shell's fit does. */
const MAX_FIT_ZOOM = 1;

export interface ContentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export default class TtViewport {
  static $inject = ["canvas", "elementRegistry"];

  constructor(
    private readonly canvas: Canvas,
    private readonly elementRegistry: ElementRegistry,
  ) {}

  /**
   * Fit every element into view, zooming in no further than 100 %.
   *
   * @deprecated Host chrome fits the diagram (the modeler shell's viewport, with the insets of the
   * chrome that is open and never above 100 %); kept for hosts without it.
   */
  fit(): void {
    const bounds = this.contentBounds();
    if (!bounds) return;

    const rect = this.canvas.getContainer().getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;
    if (!viewportWidth || !viewportHeight) {
      this.canvas.zoom("fit-viewport");
      return;
    }

    const narrow = viewportWidth <= NARROW_LAYOUT_MAX_WIDTH;
    const topInset = narrow ? TOP_INSET_NARROW : TOP_INSET;
    const sidePadding = narrow ? SIDE_PADDING_NARROW : PADDING;
    const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
    const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
    const scale = Math.min(
      (viewportWidth - 2 * sidePadding) / contentWidth,
      (viewportHeight - topInset - PADDING) / contentHeight,
      MAX_FIT_ZOOM,
    );
    if (!(scale > 0)) {
      this.canvas.zoom("fit-viewport");
      return;
    }
    this.canvas.viewbox({
      x: bounds.minX + contentWidth / 2 - viewportWidth / 2 / scale,
      y: this.viewboxTop(bounds, contentHeight, scale, viewportHeight, topInset, narrow),
      width: viewportWidth / scale,
      height: viewportHeight / scale,
    });
  }

  /**
   * On a narrow (portrait) canvas the content is centred in the free band below the palette: the
   * band is tall, and a diagram pinned to its top would slide under the top chrome on the first
   * zoom step around the viewport centre. Wider hosts keep it at the top, because their lower left
   * corner tends to hold an overlay of their own, such as a legend.
   */
  private viewboxTop(
    bounds: ContentBounds,
    contentHeight: number,
    scale: number,
    viewportHeight: number,
    topInset: number,
    narrow: boolean,
  ): number {
    if (!narrow) return bounds.minY - topInset / scale;
    const freeHeight = viewportHeight - topInset - PADDING;
    const slack = Math.max(0, freeHeight - contentHeight * scale);
    return bounds.minY - (topInset + slack / 2) / scale;
  }

  /**
   * The tight box around every element and its label text in diagram coordinates, `undefined`
   * while the canvas holds none. Read from the elements' geometry and the label layout rather than
   * measured on the SVG, so zoom and scroll, at which a browser lays text out differently, never
   * change it.
   */
  contentBounds(): ContentBounds | undefined {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const include = (x: number, y: number, width: number, height: number) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    };
    for (const element of this.elementRegistry.getAll()) {
      const shape = element as { x?: unknown; y?: unknown; width?: unknown; height?: unknown };
      if (
        typeof shape.x !== "number" ||
        typeof shape.y !== "number" ||
        typeof shape.width !== "number" ||
        typeof shape.height !== "number"
      ) {
        continue;
      }
      include(shape.x, shape.y, shape.width, shape.height);
      const text = isTtElement(element) ? labelTextBox(element) : undefined;
      if (text) include(shape.x + text.x, shape.y + text.y, text.width, text.height);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : undefined;
  }
}
