/**
 * Deterministic serialisation of the document model.
 *
 * Producing byte-stable JSON (sorted arrays, fixed key order, rounded
 * coordinates) makes diagrams diff-friendly in version control and gives
 * stable share URLs / embedded payloads.
 */

import {
  ANNOTATION_FIELDS,
  DOCUMENT_FIELDS,
  FLOW_FIELDS,
  INTERACTION_FIELDS,
  TEAM_NODE_FIELDS,
  withForeignFields,
} from "./foreign";
import { DOCUMENT_VERSION } from "./types";
import type {
  FlowShape,
  InteractionShape,
  Position,
  Size,
  TeamNode,
  TextAnnotation,
  TtDocument,
} from "./types";

/** Round to 2 decimals to strip floating-point drift from drag operations. */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function normPosition(p: Position): Position {
  return { x: round(p.x), y: round(p.y) };
}

function normSize(s: Size): Size {
  return { width: round(s.width), height: round(s.height) };
}

/** Drops undefined fields and applies a fixed key order to a node. */
function normNode(n: TeamNode): TeamNode {
  const out: TeamNode = {
    id: n.id,
    type: n.type,
    label: n.label,
    position: normPosition(n.position),
    size: normSize(n.size),
  };
  if (n.description) out.description = n.description;
  if (n.fill) out.fill = n.fill;
  if (n.stroke) out.stroke = n.stroke;
  return withForeignFields(out, n, TEAM_NODE_FIELDS);
}

function normInteraction(e: InteractionShape): InteractionShape {
  const out: InteractionShape = {
    id: e.id,
    mode: e.mode,
    position: normPosition(e.position),
    size: normSize(e.size),
  };
  if (e.label) out.label = e.label;
  if (e.fill) out.fill = e.fill;
  if (e.stroke) out.stroke = e.stroke;
  return withForeignFields(out, e, INTERACTION_FIELDS);
}

function normFlow(f: FlowShape): FlowShape {
  const out: FlowShape = {
    id: f.id,
    position: normPosition(f.position),
    size: normSize(f.size),
  };
  if (f.label) out.label = f.label;
  return withForeignFields(out, f, FLOW_FIELDS);
}

function normAnnotation(a: TextAnnotation): TextAnnotation {
  const out: TextAnnotation = {
    id: a.id,
    text: a.text,
    position: normPosition(a.position),
    size: normSize(a.size),
  };
  if (a.attachedTo) out.attachedTo = a.attachedTo;
  return withForeignFields(out, a, ANNOTATION_FIELDS);
}

const byId = (a: { id: string }, b: { id: string }): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * Returns a canonicalised copy of a document (sorted, rounded, version-stamped). Fields the
 * modeler does not know follow the known ones, sorted by name.
 */
export function canonicalize(doc: TtDocument): TtDocument {
  return withForeignFields(
    {
      version: DOCUMENT_VERSION,
      title: doc.title,
      nodes: [...doc.nodes].map(normNode).sort(byId),
      interactions: [...doc.interactions].map(normInteraction).sort(byId),
      flows: [...doc.flows].map(normFlow).sort(byId),
      annotations: [...doc.annotations].map(normAnnotation).sort(byId),
    },
    doc,
    DOCUMENT_FIELDS,
  );
}

/**
 * Serialises a document to deterministic JSON. An empty `annotations` list is left out, so
 * re-saving a model that has no annotations changes nothing but its version stamp. The pretty
 * form is the file on disk and ends with a line break, like the files editors and Git expect;
 * the compact form (share links, local storage) has none.
 */
export function serializeDocument(doc: TtDocument, pretty = true): string {
  const canonical = canonicalize(doc);
  const output =
    canonical.annotations.length > 0
      ? canonical
      : Object.fromEntries(Object.entries(canonical).filter(([key]) => key !== "annotations"));
  return pretty ? `${JSON.stringify(output, null, 2)}\n` : JSON.stringify(output);
}
