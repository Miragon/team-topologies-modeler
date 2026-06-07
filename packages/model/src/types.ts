/**
 * Pure (DOM-free) domain types for the Team Topologies model.
 *
 * This module is the canonical representation of a diagram and must never
 * import from the rendering layer (`@xyflow/react`) or touch the DOM, so it
 * can be unit-tested in isolation and reused across views / exporters.
 */

/** MIME type used when dragging a team type from the palette onto the canvas. */
export const DND_MIME = "application/x-tt-team-type";

/** The four fundamental team types in Team Topologies. */
export type TeamType =
  | "stream-aligned"
  | "enabling"
  | "complicated-subsystem"
  | "platform";

export const TEAM_TYPES: readonly TeamType[] = [
  "stream-aligned",
  "enabling",
  "complicated-subsystem",
  "platform",
] as const;

/** The three core team interaction modes in Team Topologies. */
export type InteractionMode = "collaboration" | "x-as-a-service" | "facilitating";

export const INTERACTION_MODES: readonly InteractionMode[] = [
  "collaboration",
  "x-as-a-service",
  "facilitating",
] as const;

/** Geometric size of a node in canvas units (px). Encodes cognitive load. */
export interface Size {
  width: number;
  height: number;
}

/** Position of a node on the canvas in canvas units (px). */
export interface Position {
  x: number;
  y: number;
}

/** A team node in the canonical document model. */
export interface TeamNode {
  id: string;
  type: TeamType;
  label: string;
  description?: string;
  position: Position;
  size: Size;
  fill?: string;
  stroke?: string;
}

/**
 * An interaction in the canonical document model.
 *
 * Per the official Team Topologies notation, an interaction is a placed,
 * resizable SHAPE (parallelogram / triangle / circle) overlaid on the boundary
 * between the teams it relates to — not a connecting line. The relationship is
 * therefore spatial (overlap), so there is no source/target reference.
 */
export interface InteractionShape {
  id: string;
  mode: InteractionMode;
  label?: string;
  position: Position;
  size: Size;
  fill?: string;
  stroke?: string;
}

/**
 * A "flow of change" guide: a placed, resizable arrow element. Lets you anchor
 * the implied left-to-right flow, and visualise several team groupings on one
 * canvas.
 */
export interface FlowShape {
  id: string;
  label?: string;
  position: Position;
  size: Size;
}

/** Current document schema version. Bump + add a migration when shape changes. */
export const DOCUMENT_VERSION = 2 as const;

/**
 * A complete Team Topologies diagram. This is what gets serialised to JSON,
 * embedded into exported images, and encoded into share URLs.
 */
export interface TtDocument {
  version: typeof DOCUMENT_VERSION;
  title: string;
  nodes: TeamNode[];
  interactions: InteractionShape[];
  flows: FlowShape[];
}
