/**
 * Fields a document carries that this modeler does not know, such as a vendor's `"x-vendor"` on a
 * team. They are kept through open and save, written after the known fields and sorted, so another
 * tool's data survives an edit in the modeler and the output stays deterministic.
 */

export const DOCUMENT_FIELDS = [
  "version",
  "title",
  "nodes",
  "interactions",
  "flows",
  "annotations",
] as const;
export const TEAM_NODE_FIELDS = [
  "id",
  "type",
  "label",
  "description",
  "position",
  "size",
  "fill",
  "stroke",
] as const;
export const INTERACTION_FIELDS = [
  "id",
  "mode",
  "label",
  "position",
  "size",
  "fill",
  "stroke",
] as const;
export const FLOW_FIELDS = ["id", "label", "position", "size"] as const;
export const ANNOTATION_FIELDS = ["id", "text", "position", "size", "attachedTo"] as const;

/** Unknown fields by name, sorted, with their values in canonical form. */
export type ForeignFields = Readonly<Record<string, unknown>>;

/** JSON objects have no key order, so nested keys are sorted too: equal data, equal bytes. */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value === null || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalValue(record[key])]),
  );
}

/** The fields of `value` outside `knownFields`, or undefined when there are none. */
export function foreignFields(
  value: object,
  knownFields: readonly string[],
): ForeignFields | undefined {
  const record = value as Record<string, unknown>;
  const names = Object.keys(record)
    .filter((name) => !knownFields.includes(name) && record[name] !== undefined)
    .sort();
  if (names.length === 0) return undefined;
  return Object.fromEntries(names.map((name) => [name, canonicalValue(record[name])]));
}

/**
 * `known` followed by the foreign fields of `source`. Built from entries, never by assignment, so
 * a field named `__proto__` stays a field instead of replacing the prototype.
 */
export function withForeignFields<T extends object>(
  known: T,
  source: object | undefined,
  knownFields: readonly string[],
): T {
  const foreign = source ? foreignFields(source, knownFields) : undefined;
  if (!foreign) return known;
  return Object.fromEntries([...Object.entries(known), ...Object.entries(foreign)]) as T;
}
