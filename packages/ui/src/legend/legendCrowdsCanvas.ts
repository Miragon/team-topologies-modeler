/** The narrow-screen breakpoint of ui.css, where the inspector turns into a bottom sheet. */
export const NARROW_SCREEN_QUERY = "(max-width: 760px)";

/**
 * Narrow screens, or a viewport too short for the legend (about 330px tall) to sit beside a fitted
 * diagram without covering its lower left part.
 */
const LEGEND_CROWDS_CANVAS_QUERY = `${NARROW_SCREEN_QUERY}, (max-height: 820px)`;

export function matchesMedia(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/** Where the legend would cover the diagram, a host starts with it closed; its menu opens it. */
export function legendCrowdsCanvas(): boolean {
  return matchesMedia(LEGEND_CROWDS_CANVAS_QUERY);
}
