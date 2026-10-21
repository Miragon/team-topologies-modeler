/**
 * Runtime validation for the document model using Zod.
 *
 * Anything entering the app from the outside world (imported files, share
 * URLs, localStorage) is parsed through {@link parseDocument} so malformed or
 * tampered data can never corrupt the editor state. Fields the schema does not
 * know pass through untouched (see `foreign.ts`), so another tool's data
 * survives a save.
 */

import { z } from "zod";
import { documentIdProblems } from "./ids";
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

export const teamNodeSchema = z.looseObject({
  id: z.string().min(1),
  type: teamTypeSchema,
  label: z.string(),
  description: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  fill: hexColor.optional(),
  stroke: hexColor.optional(),
});

export const interactionSchema = z.looseObject({
  id: z.string().min(1),
  mode: interactionModeSchema,
  label: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
  fill: hexColor.optional(),
  stroke: hexColor.optional(),
});

export const flowSchema = z.looseObject({
  id: z.string().min(1),
  label: z.string().optional(),
  position: positionSchema,
  size: sizeSchema,
});

export const annotationSchema = z.looseObject({
  id: z.string().min(1),
  text: z.string(),
  position: positionSchema,
  size: sizeSchema,
  attachedTo: z.string().min(1).optional(),
});

export const documentSchema = z
  .looseObject({
    version: z.literal(DOCUMENT_VERSION),
    title: z.string(),
    nodes: z.array(teamNodeSchema),
    interactions: z.array(interactionSchema),
    flows: z.array(flowSchema),
    annotations: z.array(annotationSchema),
  })
  .superRefine((document, context) => {
    for (const { path, message } of documentIdProblems(document)) {
      context.addIssue({ code: "custom", path, message });
    }
  });

/** One reason a document is invalid, at the path of the offending value. */
export interface DocumentIssue {
  path: (string | number)[];
  message: string;
}

export type ParseResult =
  { ok: true; document: TtDocument } | { ok: false; error: string; issues: DocumentIssue[] };

/**
 * Validates and (if necessary) migrates unknown data into a {@link TtDocument}.
 * Returns a discriminated result rather than throwing so callers can show a
 * friendly message, or point at each offending value (`issues`).
 */
export function parseDocument(input: unknown): ParseResult {
  const { document: migrated, interactionFileIndexes } = migrate(input);
  const result = documentSchema.safeParse(migrated);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: pathInFile(
        issue.path.filter((key): key is string | number => typeof key !== "symbol"),
        interactionFileIndexes,
      ),
      message: issue.message,
    }));
    return {
      ok: false,
      error: issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      issues,
    };
  }
  return { ok: true, document: result.data as TtDocument };
}

/** The last document version that modelled interactions as edges without geometry. */
const EDGE_INTERACTIONS_VERSION = 1;

interface Migration {
  document: unknown;
  /** For each interaction the migrated document keeps, its index in the input. */
  interactionFileIndexes: readonly number[];
}

/**
 * Forward-migrates older document shapes to the current version. v1 modelled
 * interactions as edges (source/target, no geometry) and carried a
 * `showFlowOfChange` flag; v2 makes interactions placed shapes and adds `flows`;
 * v3 adds `annotations`. The edge-interactions of a v1 file can't be placed
 * meaningfully, so they're dropped. From v2 on, an interaction without position
 * or size is refused like any other missing field: dropped, it would vanish from
 * the file on the next save without a word.
 */
function migrate(input: unknown): Migration {
  if (input == null || typeof input !== "object") {
    return { document: input, interactionFileIndexes: [] };
  }
  const doc = input as Record<string, unknown>;
  const next: Record<string, unknown> = { ...doc };
  delete next.showFlowOfChange; // v1 flag, gone in v2
  next.version = DOCUMENT_VERSION;
  if (typeof next.title !== "string") next.title = "Untitled team topology";
  if (!Array.isArray(next.nodes)) next.nodes = [];
  const dropsEdgeInteractions = doc.version === EDGE_INTERACTIONS_VERSION;
  const keptInteractions = Array.isArray(next.interactions)
    ? next.interactions
        .map((interaction: unknown, fileIndex) => ({ interaction, fileIndex }))
        .filter(({ interaction }) => !dropsEdgeInteractions || isPlacedShape(interaction))
    : [];
  next.interactions = keptInteractions.map(({ interaction }) => interaction);
  if (!Array.isArray(next.flows)) next.flows = [];
  if (!Array.isArray(next.annotations)) next.annotations = [];
  return {
    document: next,
    interactionFileIndexes: keptInteractions.map(({ fileIndex }) => fileIndex),
  };
}

function isPlacedShape(value: unknown): boolean {
  return value != null && typeof value === "object" && "position" in value && "size" in value;
}

/**
 * An issue's path in the input rather than in the migrated document: an editor points at the
 * file, and every legacy interaction dropped before an invalid one would shift its index.
 */
function pathInFile(
  path: (string | number)[],
  interactionFileIndexes: readonly number[],
): (string | number)[] {
  const [collection, index, ...rest] = path;
  if (collection !== "interactions" || typeof index !== "number") return path;
  const fileIndex = interactionFileIndexes[index];
  return fileIndex === undefined ? path : [collection, fileIndex, ...rest];
}
