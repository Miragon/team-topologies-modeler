/**
 * The browser's copies: the working diagram (autosave), so a reload never loses work, the diagram
 * the autosave last wrote over (so a replacement stays reversible after its undo offer is gone),
 * and the legend's open state (guide §5.10: kept across sessions). Offline, no network involved. A
 * blocked storage (private mode, a policy) leaves the diagram in the page and its link.
 */

import {
  parseDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import { isEmptyDocument, isSameDocument } from "./documents";

const STORAGE_KEY = "tt-modeler:document:v1";
/** The key 0.10 kept its "Restore previous diagram" copy under, so that copy stays reachable. */
const PREVIOUS_KEY = `${STORAGE_KEY}:previous`;
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

function writeSlot(key: string, doc: TtDocument): SaveOutcome {
  const store = storage();
  if (!store) return "unavailable";
  try {
    store.setItem(key, serializeDocument(doc, false));
    return "saved";
  } catch (error) {
    return isQuotaError(error) ? "full" : "unavailable";
  }
}

function readSlot(key: string): StoredDocumentResult {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return { status: "absent" };
    const parsed = parseDocument(JSON.parse(raw));
    return parsed.ok
      ? { status: "ok", document: parsed.document }
      : { status: "corrupt", detail: parsed.error };
  } catch (error) {
    return { status: "corrupt", detail: error instanceof Error ? error.message : String(error) };
  }
}

export function saveToStorage(doc: TtDocument): SaveOutcome {
  return writeSlot(STORAGE_KEY, doc);
}

export function loadFromStorage(): StoredDocumentResult {
  return readSlot(STORAGE_KEY);
}

export function savePrevious(doc: TtDocument): SaveOutcome {
  return writeSlot(PREVIOUS_KEY, doc);
}

export function loadPrevious(): StoredDocumentResult {
  return readSlot(PREVIOUS_KEY);
}

export interface AutosaveResult {
  /** "full" also when the stored diagram needed a copy there was no room for: nothing was written. */
  outcome: SaveOutcome;
  /** The stored diagram became the previous diagram. */
  keptPrevious: boolean;
}

/**
 * Writes the shown diagram over the stored one. A stored diagram of another document (the shown one
 * was opened, created or restored since) becomes the previous diagram first; without room for that
 * copy nothing is written, so a replacement never costs the stored work.
 */
export function autosave(doc: TtDocument, continuesStored: boolean): AutosaveResult {
  let keptPrevious = false;
  if (!continuesStored) {
    const stored = loadFromStorage();
    const replaced =
      stored.status === "ok" &&
      !isEmptyDocument(stored.document) &&
      !isSameDocument(stored.document, doc)
        ? stored.document
        : undefined;
    if (replaced) {
      const kept = savePrevious(replaced);
      if (kept === "full") return { outcome: "full", keptPrevious: false };
      keptPrevious = kept === "saved";
    }
  }
  return { outcome: saveToStorage(doc), keptPrevious };
}

/** The legend's state the visitor chose last; undefined keeps the chrome's default, closed. */
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
