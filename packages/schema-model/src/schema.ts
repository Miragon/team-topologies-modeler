/**
 * Runtime validation for the document model using Zod.
 *
 * Anything entering the app from the outside world (imported files, share
 * URLs, localStorage) is parsed through {@link parseDocument} so malformed or
 * tampered data can never corrupt the editor state.
 */

import { z } from "zod";
import { DOCUMENT_VERSION, INTERACTION_MODES, TEAM_TYPES } from "./types";
import type { TtDocument } from "./types";

const teamTypeSchema = z.enum(TEAM_TYPES as unknown as [string, ...string[]]);
const interactionModeSchema = z.enum(INTERACTION_MODES as unknown as [string, ...string[]]);

const sizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
});

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "expected a hex colour");

export const teamNodeSchema = z.object({
  id: z.string().min(1),
  type: teamTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  fill: hexColor.optional(),
  stroke: hexColor.optional(),
});

export const interactionSchema = z.object({
  id: z.string().min(1),
  mode: interactionModeSchema,
  label: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  fill: hexColor.optional(),
  stroke: hexColor.optional(),
});

export const flowSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
});

export const documentSchema = z.object({
  version: z.literal(DOCUMENT_VERSION),
  title: z.string(),
  nodes: z.array(teamNodeSchema),
  interactions: z.array(interactionSchema),
  flows: z.array(flowSchema),
});

export type ParseResult = { ok: true; document: TtDocument } | { ok: false; error: string };

/**
 * Validates and (if necessary) migrates unknown data into a {@link TtDocument}.
 * Returns a discriminated result rather than throwing so callers can show a
 * friendly message.
 */
export function parseDocument(input: unknown): ParseResult {
  const migrated = migrate(input);
  const result = documentSchema.safeParse(migrated);
  if (!result.success) {
    return {
      ok: false,
      error: result.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    };
  }
  return { ok: true, document: result.data as TtDocument };
}

/**
 * Forward-migrates older document shapes to the current version. v1 modelled
 * interactions as edges (source/target, no geometry) and carried a
 * `showFlowOfChange` flag; v2 makes interactions placed shapes and adds `flows`.
 * Legacy edge-interactions can't be placed meaningfully, so they're dropped.
 */
function migrate(input: unknown): unknown {
  if (input == null || typeof input !== "object") return input;
  const doc = input as Record<string, unknown>;
  const next: Record<string, unknown> = { ...doc };
  delete next.showFlowOfChange; // v1 flag, gone in v2
  next.version = DOCUMENT_VERSION;
  if (typeof next.title !== "string") next.title = "Untitled team topology";
  if (!Array.isArray(next.nodes)) next.nodes = [];
  // Keep only placed interaction shapes; drop legacy edges (no position/size).
  next.interactions = Array.isArray(next.interactions)
    ? next.interactions.filter(
        (e) => e != null && typeof e === "object" && "position" in e && "size" in e,
      )
    : [];
  if (!Array.isArray(next.flows)) next.flows = [];
  return next;
}
