/**
 * The Team Topologies visual notation, encoded as data.
 *
 * Colours, shapes and stroke styles follow the official
 * "Team-Shape-Templates" specification published by Team Topologies
 * (https://github.com/TeamTopologies/Team-Shape-Templates):
 *
 *  - Team shapes are SOLID outlines (long-lived structures).
 *  - Interaction-mode shapes are 50% transparent with DASHED outlines
 *    (short-lived interactions).
 *  - Each element is distinguished by SHAPE as well as colour, so the
 *    notation stays readable for people with colour-vision deficiency.
 *
 * This module is pure data — it must not import the rendering layer.
 */

import type { InteractionMode, Size, TeamType } from "./types";

export type TeamShape = "rounded-rect-horizontal" | "rounded-rect-vertical" | "octagon" | "rect";

export type InteractionGlyph = "parallelogram" | "triangle" | "circle";

export type StrokeStyle = "solid" | "dashed" | "dotted";

export interface TeamTypeSpec {
  type: TeamType;
  /** Short display name. */
  label: string;
  /** One-line purpose, shown in the palette and inspector. */
  description: string;
  shape: TeamShape;
  fill: string;
  stroke: string;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  /** Default size when a node of this type is created. */
  defaultSize: Size;
  /** Minimum size enforced by the resizer. */
  minSize: Size;
}

export interface InteractionModeSpec {
  mode: InteractionMode;
  label: string;
  description: string;
  shape: InteractionGlyph;
  fill: string;
  stroke: string;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  /** Opacity for the interaction shape (short-lived → translucent). */
  opacity: number;
  /** Whether direction is semantically meaningful (the X-as-a-Service triangle). */
  directional: boolean;
  /** Default size when a shape of this mode is created. */
  defaultSize: Size;
  /** Minimum size enforced by the resizer. */
  minSize: Size;
}

/** The left-to-right "flow of change" guide, a placeable annotation element. */
export interface FlowSpec {
  label: string;
  fill: string;
  stroke: string;
  strokeStyle: StrokeStyle;
  strokeWidth: number;
  defaultSize: Size;
  minSize: Size;
}

export const TEAM_TYPE_SPECS: Record<TeamType, TeamTypeSpec> = {
  "stream-aligned": {
    type: "stream-aligned",
    label: "Stream-aligned",
    description: "Aligned to a single, valuable stream of work; owns it end-to-end.",
    shape: "rounded-rect-horizontal",
    fill: "#FFEDB8",
    stroke: "#FFD966",
    strokeStyle: "solid",
    strokeWidth: 2,
    defaultSize: { width: 240, height: 96 },
    minSize: { width: 140, height: 64 },
  },
  enabling: {
    type: "enabling",
    label: "Enabling",
    description:
      "Helps stream-aligned teams acquire missing capabilities; coaches, then steps back.",
    shape: "rounded-rect-vertical",
    fill: "#DFBDCF",
    stroke: "#D09CB7",
    strokeStyle: "solid",
    strokeWidth: 2,
    defaultSize: { width: 120, height: 200 },
    minSize: { width: 80, height: 120 },
  },
  "complicated-subsystem": {
    type: "complicated-subsystem",
    label: "Complicated Subsystem",
    description:
      "Owns a part of the system needing deep specialist knowledge, reducing others' cognitive load.",
    shape: "octagon",
    fill: "#FFC08B",
    stroke: "#E88814",
    strokeStyle: "solid",
    strokeWidth: 2,
    defaultSize: { width: 170, height: 150 },
    minSize: { width: 110, height: 100 },
  },
  platform: {
    type: "platform",
    label: "Platform",
    description:
      "Provides internal self-service capabilities to reduce cognitive load for stream-aligned teams.",
    shape: "rect",
    fill: "#B7CDF1",
    stroke: "#6D9EEB",
    strokeStyle: "solid",
    strokeWidth: 2,
    defaultSize: { width: 380, height: 130 },
    minSize: { width: 200, height: 90 },
  },
};

export const INTERACTION_MODE_SPECS: Record<InteractionMode, InteractionModeSpec> = {
  collaboration: {
    mode: "collaboration",
    label: "Collaboration",
    description:
      "Two teams work closely together for a defined period; high overhead, high discovery.",
    shape: "parallelogram",
    fill: "#C6BEDF",
    stroke: "#967EE2",
    strokeStyle: "dashed",
    strokeWidth: 2,
    opacity: 0.5,
    directional: false,
    defaultSize: { width: 112, height: 72 },
    minSize: { width: 60, height: 44 },
  },
  "x-as-a-service": {
    mode: "x-as-a-service",
    label: "X-as-a-Service",
    description:
      "One team consumes something the other provides 'as a service'; minimal collaboration.",
    shape: "triangle",
    fill: "#B4B4B4",
    stroke: "#999696",
    strokeStyle: "dashed",
    strokeWidth: 2,
    opacity: 0.5,
    directional: true,
    defaultSize: { width: 88, height: 78 },
    minSize: { width: 54, height: 48 },
  },
  facilitating: {
    mode: "facilitating",
    label: "Facilitating",
    description:
      "One team helps/coaches another to clear impediments and learn; sensing and discovery.",
    shape: "circle",
    fill: "#C9DFBE",
    stroke: "#78996B",
    strokeStyle: "dashed",
    strokeWidth: 2,
    opacity: 0.5,
    directional: false,
    defaultSize: { width: 84, height: 84 },
    minSize: { width: 48, height: 48 },
  },
};

/**
 * The "flow of change" guide — a placeable dashed arrow (left-to-right).
 * Not a team or interaction: a standalone annotation element.
 */
export const FLOW_SPEC: FlowSpec = {
  label: "Flow of change",
  fill: "transparent",
  stroke: "#6b6459",
  strokeStyle: "dashed",
  strokeWidth: 2,
  defaultSize: { width: 520, height: 64 },
  minSize: { width: 160, height: 36 },
};

/** Maps a stroke style to an SVG/CSS dash array (empty string = solid). */
export function dashArray(style: StrokeStyle, strokeWidth = 2): string {
  switch (style) {
    case "dashed":
      return `${strokeWidth * 3} ${strokeWidth * 2}`;
    case "dotted":
      return `${strokeWidth} ${strokeWidth * 1.5}`;
    case "solid":
    default:
      return "";
  }
}

export const ALL_TEAM_SPECS: readonly TeamTypeSpec[] = Object.values(TEAM_TYPE_SPECS);
export const ALL_INTERACTION_SPECS: readonly InteractionModeSpec[] =
  Object.values(INTERACTION_MODE_SPECS);
