import type { Modeler } from "@miragon/team-topologies-renderer";
import type Selection from "diagram-js/lib/features/selection/Selection";
import { NARROW_SCREEN_QUERY, matchesMedia } from "./legendCrowdsCanvas";

/**
 * On narrow screens the inspector's bottom sheet hides the legend (ui.css). A host calls this
 * before it shows the legend on request, so the request visibly does something: the sheet closes.
 */
export function makeRoomForLegend(modeler: Modeler): void {
  if (matchesMedia(NARROW_SCREEN_QUERY)) modeler.get<Selection>("selection").select(null);
}
