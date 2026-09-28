/**
 * Deterministic serialisation of the document model.
 *
 * Producing byte-stable JSON (sorted arrays, fixed key order, rounded
 * coordinates) makes diagrams diff-friendly in version control and gives
 * stable share URLs / embedded payloads.
 */

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
  return out;
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
  return out;
}

function normFlow(f: FlowShape): FlowShape {
  const out: FlowShape = {
    id: f.id,
    position: normPosition(f.position),
    size: normSize(f.size),
  };
  if (f.label) out.label = f.label;
  return out;
}

function normAnnotation(a: TextAnnotation): TextAnnotation {
  const out: TextAnnotation = {
    id: a.id,
    text: a.text,
    position: normPosition(a.position),
    size: normSize(a.size),
  };
  if (a.attachedTo) out.attachedTo = a.attachedTo;
  return out;
}

const byId = (a: { id: string }, b: { id: string }): number =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Returns a canonicalised copy of a document (sorted, rounded, version-stamped). */
export function canonicalize(doc: TtDocument): TtDocument {
  return {
    version: DOCUMENT_VERSION,
    title: doc.title,
    nodes: [...doc.nodes].map(normNode).sort(byId),
    interactions: [...doc.interactions].map(normInteraction).sort(byId),
    flows: [...doc.flows].map(normFlow).sort(byId),
    annotations: [...doc.annotations].map(normAnnotation).sort(byId),
  };
}

/**
 * Serialises a document to deterministic, pretty-printed JSON. An empty
 * `annotations` list is left out, so re-saving a model that has no annotations
 * changes nothing but its version stamp.
 */
export function serializeDocument(doc: TtDocument, pretty = true): string {
  const { annotations, ...canonical } = canonicalize(doc);
  const output = annotations.length > 0 ? { ...canonical, annotations } : canonical;
  return JSON.stringify(output, null, pretty ? 2 : 0);
}
