/**
 * The browser's copies: the working diagram (autosave), so a reload never loses work, and the
 * legend's open state (guide §5.10: kept across sessions). Offline, no network involved. A
 * blocked storage (private mode, a policy) leaves the diagram in the page and its link.
 */

import {
  parseDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";

const STORAGE_KEY = "tt-modeler:document:v1";
const LEGEND_KEY = "tt-modeler:legend-open";

export type StoredDocumentResult =
  | { status: "absent" }
  | { status: "corrupt"; detail: string }
  | { status: "ok"; document: TtDocument };

export type SaveOutcome = "saved" | "full" | "unavailable";

function storage(): Storage | undefined {
  try {
    return window.localStorage ?? undefined;
  } catch {
    return undefined;
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22)
  );
}

export function saveToStorage(doc: TtDocument): SaveOutcome {
  const store = storage();
  if (!store) return "unavailable";
  try {
    store.setItem(STORAGE_KEY, serializeDocument(doc, false));
    return "saved";
  } catch (error) {
    return isQuotaError(error) ? "full" : "unavailable";
  }
}

export function loadFromStorage(): StoredDocumentResult {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return { status: "absent" };
    const parsed = parseDocument(JSON.parse(raw));
    return parsed.ok
      ? { status: "ok", document: parsed.document }
      : { status: "corrupt", detail: parsed.error };
  } catch (error) {
    return { status: "corrupt", detail: error instanceof Error ? error.message : String(error) };
  }
}

/** The legend's state the visitor chose last; undefined lets the chrome decide by the height. */
export function readLegendOpen(): boolean | undefined {
  try {
    const stored = storage()?.getItem(LEGEND_KEY);
    return stored === "true" ? true : stored === "false" ? false : undefined;
  } catch {
    return undefined;
  }
}

export function writeLegendOpen(open: boolean): void {
  try {
    storage()?.setItem(LEGEND_KEY, String(open));
  } catch {
    // The legend still follows the choice for this visit.
  }
}
