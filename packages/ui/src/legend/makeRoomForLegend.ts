import type { Modeler } from "@miragon/team-topologies-renderer";
import type Selection from "diagram-js/lib/features/selection/Selection";

/** The width up to which the modeler shell's inspector is a bottom sheet (guide §5.11). */
const NARROW_SCREEN_QUERY = "(max-width: 760px)";

function matchesMedia(query: string): boolean {
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * On narrow screens the inspector's bottom sheet hides the legend. A host calls this before it
 * shows the legend on request, so the request visibly does something: the sheet closes.
 */
export function makeRoomForLegend(modeler: Modeler): void {
  if (matchesMedia(NARROW_SCREEN_QUERY)) modeler.get<Selection>("selection").select(null);
}
