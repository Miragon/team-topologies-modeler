/**
 * Factory helpers for constructing well-formed model objects with the correct
 * notation defaults (sizes, labels). Kept DOM-free.
 */

import { nanoid } from "nanoid";
import { FLOW_SPEC, INTERACTION_MODE_SPECS, TEAM_TYPE_SPECS } from "./notation";
import type {
  FlowShape,
  InteractionMode,
  InteractionShape,
  Position,
  TeamNode,
  TeamType,
  TtDocument,
} from "./types";
import { DOCUMENT_VERSION } from "./types";

export function newId(prefix: string): string {
  return `${prefix}_${nanoid(8)}`;
}

/** Creates a team node of the given type at a position, with notation defaults. */
export function createTeamNode(
  type: TeamType,
  position: Position,
  overrides: Partial<Omit<TeamNode, "id" | "type">> = {},
): TeamNode {
  const spec = TEAM_TYPE_SPECS[type];
  return {
    id: newId("team"),
    type,
    label: overrides.label ?? spec.label,
    description: overrides.description,
    position,
    size: overrides.size ?? { ...spec.defaultSize },
    fill: overrides.fill,
    stroke: overrides.stroke,
  };
}

/** Creates a placed interaction shape of the given mode, with notation defaults. */
export function createInteractionShape(
  mode: InteractionMode,
  position: Position,
  overrides: Partial<Omit<InteractionShape, "id" | "mode" | "position">> = {},
): InteractionShape {
  const spec = INTERACTION_MODE_SPECS[mode];
  return {
    id: newId("int"),
    mode,
    position,
    size: overrides.size ?? { ...spec.defaultSize },
    label: overrides.label,
    fill: overrides.fill,
    stroke: overrides.stroke,
  };
}

/** Creates a placed "flow of change" arrow, with notation defaults. */
export function createFlowShape(
  position: Position,
  overrides: Partial<Omit<FlowShape, "id" | "position">> = {},
): FlowShape {
  return {
    id: newId("flow"),
    position,
    size: overrides.size ?? { ...FLOW_SPEC.defaultSize },
    label: overrides.label ?? FLOW_SPEC.label,
  };
}

/** An empty document with sensible defaults. */
export function emptyDocument(title = "Untitled team topology"): TtDocument {
  return {
    version: DOCUMENT_VERSION,
    title,
    nodes: [],
    interactions: [],
    flows: [],
  };
}
