/**
 * diagram-js runtime model for the Team Topologies notation. Every element is a
 * placed, resizable SHAPE discriminated by `ttKind`:
 *  - `team`        — one of the four team types (label inside the box)
 *  - `interaction` — a mode glyph (parallelogram / triangle / circle), 50%
 *                    transparent, overlaid on the boundary between teams
 *  - `flow`        — the "flow of change" arrow guide
 *
 * These runtime properties are the source of truth while editing; the exporter
 * rebuilds the canonical `TtDocument` from them.
 */

import type { Shape } from "diagram-js/lib/model/Types";
import type { InteractionMode, TeamType } from "@tt-modeler/schema-model";

export type TtKind = "team" | "interaction" | "flow";

export interface TtTeam extends Shape {
  ttKind: "team";
  teamType: TeamType;
  /** Display name (separate from diagram-js `label`). */
  ttLabel?: string;
  description?: string;
  fill?: string;
  stroke?: string;
}

export interface TtInteraction extends Shape {
  ttKind: "interaction";
  mode: InteractionMode;
  ttLabel?: string;
  fill?: string;
  stroke?: string;
}

export interface TtFlow extends Shape {
  ttKind: "flow";
  ttLabel?: string;
}

export type TtElement = TtTeam | TtInteraction | TtFlow;

function kindOf(el: unknown): string | undefined {
  return typeof el === "object" && el !== null
    ? ((el as { ttKind?: unknown }).ttKind as string | undefined)
    : undefined;
}

export function isTtElement(el: unknown): el is TtElement {
  return typeof kindOf(el) === "string";
}

export function isTtTeam(el: unknown): el is TtTeam {
  return kindOf(el) === "team";
}

export function isTtInteraction(el: unknown): el is TtInteraction {
  return kindOf(el) === "interaction";
}

export function isTtFlow(el: unknown): el is TtFlow {
  return kindOf(el) === "flow";
}
