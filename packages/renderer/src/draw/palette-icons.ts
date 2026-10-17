/**
 * Tiny inline-SVG glyphs for the palette entries — the same shapes the canvas
 * draws (so the palette is a faithful preview of each team type / interaction
 * mode). Returned as HTML strings for diagram-js palette `html`.
 */

import {
  FLOW_SPEC,
  INTERACTION_MODE_SPECS,
  TEAM_TYPE_SPECS,
  dashArray,
} from "@miragon/team-topologies-schema-model";
import type { InteractionMode, TeamType } from "@miragon/team-topologies-schema-model";
import { ICON_SQUARE_DASHED_MOUSE_POINTER, iconMarkup } from "./icons.js";

/** The lasso is a tool, not notation, so it is a Lucide icon sized to sit beside the previews. */
const LASSO_ICON_SIZE = 20;

function svg(inner: string): string {
  return `<svg class="tt-palette-svg" width="24" height="24" viewBox="0 0 26 26" aria-hidden="true">${inner}</svg>`;
}

export function teamIconSvg(type: TeamType): string {
  const s = TEAM_TYPE_SPECS[type];
  const dash = dashArray(s.strokeStyle, 1.5);
  const common =
    `fill="${s.fill}" stroke="${s.stroke}" stroke-width="1.5"` +
    (dash ? ` stroke-dasharray="${dash}"` : "");
  switch (s.shape) {
    case "octagon":
      return svg(`<polygon points="8,3 18,3 23,8 23,18 18,23 8,23 3,18 3,8" ${common}/>`);
    case "rounded-rect-vertical":
      return svg(`<rect x="8" y="3" width="10" height="20" rx="4" ${common}/>`);
    case "rect":
      return svg(`<rect x="3" y="7" width="20" height="12" rx="1.5" ${common}/>`);
    default:
      return svg(`<rect x="3" y="8" width="20" height="10" rx="5" ${common}/>`);
  }
}

export function flowIconSvg(): string {
  const dash = dashArray(FLOW_SPEC.strokeStyle, 1.5);
  return svg(
    `<g fill="none" stroke="${FLOW_SPEC.stroke}" stroke-width="1.5" stroke-linejoin="round"` +
      (dash ? ` stroke-dasharray="${dash}"` : "") +
      `><polygon points="3,9 16,9 16,5 23,13 16,21 16,17 3,17"/></g>`,
  );
}

export function annotationIconSvg(): string {
  return svg(
    `<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">` +
      `<path d="M10 4H5v18h5"/><path d="M13 9h9M13 13h9M13 17h6"/></g>`,
  );
}

/** The lasso (multi-select) tool: Lucide square-dashed-mouse-pointer. */
export function lassoIconSvg(): string {
  return iconMarkup(ICON_SQUARE_DASHED_MOUSE_POINTER, {
    size: LASSO_ICON_SIZE,
    className: "tt-palette-svg",
  });
}

export function interactionIconSvg(mode: InteractionMode): string {
  const s = INTERACTION_MODE_SPECS[mode];
  const dash = dashArray(s.strokeStyle, 1.5);
  const common =
    `fill="${s.fill}" fill-opacity="${s.opacity}" stroke="${s.stroke}" stroke-width="1.5"` +
    (dash ? ` stroke-dasharray="${dash}"` : "");
  switch (s.shape) {
    case "circle":
      return svg(`<circle cx="13" cy="13" r="9" ${common}/>`);
    case "triangle":
      return svg(`<polygon points="5,6 22,13 5,20" ${common}/>`);
    default:
      return svg(`<polygon points="9,6 23,6 17,20 3,20" ${common}/>`);
  }
}
