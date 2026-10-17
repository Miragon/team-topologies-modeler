/**
 * Fits the diagram into the visible canvas. Unlike diagram-js `fit-viewport`, it keeps the
 * strip under the floating palette free, so no element starts hidden behind it.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";

/** Up to this container width the palette sits on its own row below the host's top chrome. */
const NARROW_LAYOUT_MAX_WIDTH = 760;

const TOP_INSET = 88;
const TOP_INSET_NARROW = 120;
const PADDING = 56;
const SIDE_PADDING_NARROW = 24;
const MAX_FIT_ZOOM = 1.25;

interface Bounds {
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

  /** Fit every element into view, zooming in no further than 125 %. */
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
    bounds: Bounds,
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

  private contentBounds(): Bounds | undefined {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
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
      minX = Math.min(minX, shape.x);
      minY = Math.min(minY, shape.y);
      maxX = Math.max(maxX, shape.x + shape.width);
      maxY = Math.max(maxY, shape.y + shape.height);
    }
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : undefined;
  }
}
