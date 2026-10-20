import {
  SAMPLE_DOCUMENT,
  documentIdProblems,
  emptyDocument,
  parseDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";

export const EMPTY_MAP = serializeDocument(emptyDocument("New team topology"));

/** The bundled example diagram (identical to the demo webapp), as a starting point. */
export const EXAMPLE_MAP = serializeDocument(SAMPLE_DOCUMENT);

function documentOf(text: string): TtDocument | undefined {
  let value: unknown;
  try {
    value = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return undefined;
  }
  const result = parseDocument(value);
  return result.ok ? result.document : undefined;
}

/**
 * The document with the example's teams, interactions, flow and annotation added, as "Insert
 * example" of the empty-file hint writes it (guide §13.5: one edit, no confirmation). What the file
 * already holds (its title, fields of other tools) stays; a file without a title takes the
 * example's. Undefined when the text is no valid diagram or its ids would collide with the
 * example's. The line break style follows the document.
 */
export function withExampleInserted(text: string): string | undefined {
  const current = documentOf(text);
  if (!current) return undefined;
  const hasTitle = /"title"\s*:/.test(text);
  const combined: TtDocument = {
    ...current,
    title: hasTitle ? current.title : SAMPLE_DOCUMENT.title,
    nodes: [...current.nodes, ...SAMPLE_DOCUMENT.nodes],
    interactions: [...current.interactions, ...SAMPLE_DOCUMENT.interactions],
    flows: [...current.flows, ...SAMPLE_DOCUMENT.flows],
    annotations: [...current.annotations, ...SAMPLE_DOCUMENT.annotations],
  };
  if (documentIdProblems(combined).length > 0) return undefined;
  const serialized = serializeDocument(combined);
  return text.includes("\r\n") ? serialized.replace(/\n/g, "\r\n") : serialized;
}
