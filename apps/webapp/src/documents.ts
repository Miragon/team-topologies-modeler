import { serializeDocument, type TtDocument } from "@miragon/team-topologies-schema-model";

/** A diagram without elements; its title alone does not count. */
export function isEmptyDocument(doc: TtDocument): boolean {
  return (
    doc.nodes.length === 0 &&
    doc.interactions.length === 0 &&
    doc.flows.length === 0 &&
    doc.annotations.length === 0
  );
}

export function isSameDocument(first: TtDocument, second: TtDocument): boolean {
  return serializeDocument(first, false) === serializeDocument(second, false);
}
