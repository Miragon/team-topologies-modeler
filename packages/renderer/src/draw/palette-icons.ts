/**
 * Tiny inline-SVG glyphs for the palette entries — the same shapes the canvas
 * draws (so the palette is a faithful preview of each team type / interaction
 * mode). Returned as HTML strings for diagram-js palette `html`.
 */

import { INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS, dashArray } from "@tt-modeler/model";
import type { InteractionMode, TeamType } from "@tt-modeler/model";

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
  return svg(
    `<g fill="none" stroke="#6b6459" stroke-width="1.5" stroke-linejoin="round" stroke-dasharray="3 2">` +
      `<polygon points="3,9 16,9 16,5 23,13 16,21 16,17 3,17"/></g>`,
  );
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
