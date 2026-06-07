/**
 * Rebuilds a canonical `TtDocument` from the diagram-js runtime model. Position
 * and size truth are the live `x/y/width/height`; editable fields (label, type,
 * mode, colours) are read from the runtime properties.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type { Root } from "diagram-js/lib/model/Types";
import { DOCUMENT_VERSION } from "@tt-modeler/model";
import type {
  FlowShape,
  InteractionShape,
  TeamNode,
  TtDocument,
} from "@tt-modeler/model";
import { isTtFlow, isTtInteraction, isTtTeam } from "../model/di-types.js";
import { ROOT_ID, type RootBusinessObject } from "./types.js";

export default class TtExporter {
  static $inject = ["elementRegistry", "canvas"];

  constructor(
    private readonly elementRegistry: ElementRegistry,
    private readonly canvas: Canvas,
  ) {}

  export(): TtDocument {
    let meta: RootBusinessObject | undefined;
    try {
      const root = this.canvas.getRootElement() as Root & {
        businessObject?: RootBusinessObject;
      };
      meta = root.businessObject;
    } catch {
      meta = undefined;
    }

    const nodes: TeamNode[] = [];
    const interactions: InteractionShape[] = [];
    const flows: FlowShape[] = [];

    for (const el of this.elementRegistry.getAll()) {
      if (el.id === ROOT_ID) continue;
      const geom = el as unknown as { x: number; y: number; width: number; height: number };
      const position = { x: geom.x, y: geom.y };
      const size = { width: geom.width, height: geom.height };

      if (isTtTeam(el)) {
        nodes.push({
          id: el.id,
          type: el.teamType,
          label: el.ttLabel ?? "",
          position,
          size,
          ...(el.description ? { description: el.description } : {}),
          ...(el.fill ? { fill: el.fill } : {}),
          ...(el.stroke ? { stroke: el.stroke } : {}),
        });
      } else if (isTtInteraction(el)) {
        interactions.push({
          id: el.id,
          mode: el.mode,
          position,
          size,
          ...(el.ttLabel ? { label: el.ttLabel } : {}),
          ...(el.fill ? { fill: el.fill } : {}),
          ...(el.stroke ? { stroke: el.stroke } : {}),
        });
      } else if (isTtFlow(el)) {
        flows.push({
          id: el.id,
          position,
          size,
          ...(el.ttLabel ? { label: el.ttLabel } : {}),
        });
      }
    }

    return {
      version: DOCUMENT_VERSION,
      title: meta?.title ?? "Untitled team topology",
      nodes,
      interactions,
      flows,
    };
  }
}
