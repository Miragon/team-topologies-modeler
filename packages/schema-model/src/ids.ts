/**
 * The id rules of a Team Topologies document. Besides the elements a document lists, a diagram
 * holds parts it never writes down: the diagram itself and the connector of every annotation. They
 * take ids of their own, so no element may use one of them; otherwise opening the file would fail
 * halfway, with the previous diagram already gone. The canvas also keeps its elements in a plain
 * object, where the names of JavaScript's built-in object properties already resolve.
 */

/** The id of the diagram itself (the canvas root of the renderer). */
export const DIAGRAM_ROOT_ID = "tt-root";

/** diagram-js names the roots it creates on its own `__implicitroot_<n>`. */
const ENGINE_ROOT_ID_PREFIX = "__implicitroot";

/** Connectors are not stored: an annotation's connector derives its id from the annotation. */
export function associationId(annotationId: string): string {
  return `assoc_${annotationId}`;
}

export interface DocumentIdProblem {
  /** Where the offending id sits, e.g. `["nodes", 2, "id"]`. */
  path: (string | number)[];
  message: string;
}

const COLLECTIONS = ["nodes", "interactions", "flows", "annotations"] as const;

type DocumentElements = Record<(typeof COLLECTIONS)[number], readonly { id: string }[]>;

/** Ids such as `constructor`, `toString` or `__proto__`, which every plain object already has. */
function isBuiltInPropertyId(id: string): boolean {
  return Object.hasOwn(Object.prototype, id);
}

/**
 * Every id of the document that would collide on the canvas: a duplicate, the diagram's own id, a
 * diagram-js root id, the name of a built-in object property, or the id of an annotation's
 * connector.
 */
export function documentIdProblems(doc: DocumentElements): DocumentIdProblem[] {
  const problems: DocumentIdProblem[] = [];
  const connectorIds = new Map(
    doc.annotations.map((annotation) => [associationId(annotation.id), annotation.id]),
  );
  const seen = new Set<string>();
  for (const collection of COLLECTIONS) {
    doc[collection].forEach((element, index) => {
      const path = [collection, index, "id"];
      const { id } = element;
      if (seen.has(id)) {
        problems.push({
          path,
          message: `duplicate id "${id}"; ids must be unique across nodes, interactions, flows and annotations`,
        });
      }
      seen.add(id);
      if (id === DIAGRAM_ROOT_ID) {
        problems.push({ path, message: `"${id}" is reserved for the diagram itself` });
      } else if (id.startsWith(ENGINE_ROOT_ID_PREFIX)) {
        problems.push({
          path,
          message: `ids starting with "${ENGINE_ROOT_ID_PREFIX}" are reserved`,
        });
      } else if (isBuiltInPropertyId(id)) {
        problems.push({
          path,
          message: `"${id}" is reserved: it names a built-in property of JavaScript objects`,
        });
      }
      const annotationId = connectorIds.get(id);
      if (annotationId !== undefined) {
        problems.push({
          path,
          message: `"${id}" is reserved for the connector of annotation "${annotationId}"`,
        });
      }
    });
  }
  return problems;
}
