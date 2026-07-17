/**
 * Carries the Team Topologies props across a copy-paste. diagram-js stores each
 * copied element as a plain descriptor whose built-in listener only records
 * geometry (`id/x/y/width/height/…`). Our domain data lives as flat attributes
 * on the shape (not a moddle businessObject), so without this the pasted copy
 * would lose its type, label, description and colours. This listener copies
 * those fields onto the descriptor; they then flow through to the new shape.
 */

import type EventBus from "diagram-js/lib/core/EventBus";
import { isTtElement } from "../model/di-types.js";

/** Flat props that define a Team Topologies shape, beyond geometry. */
const TT_PROPS = [
  "ttKind",
  "teamType",
  "mode",
  "ttLabel",
  "description",
  "fill",
  "stroke",
] as const;

export default class TtCopyPasteProps {
  static $inject = ["eventBus"];

  constructor(eventBus: EventBus) {
    eventBus.on(
      "copyPaste.copyElement",
      (event: { descriptor: Record<string, unknown>; element: unknown }) => {
        const { descriptor, element } = event;
        if (!isTtElement(element)) return;
        const source = element as Record<string, unknown>;
        for (const prop of TT_PROPS) {
          if (source[prop] !== undefined) descriptor[prop] = source[prop];
        }
      },
    );
  }
}
