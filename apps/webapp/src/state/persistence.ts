/**
 * Autosave + restore of the working document to localStorage, so a refresh
 * never loses work. Offline-friendly; no network involved. A second slot keeps
 * the diagram that was last replaced, so New / Example / Open / a shared link
 * can always be undone with "Restore previous diagram".
 */

import { serializeDocument } from "@miragon/team-topologies-schema-model";
import { parseDocument } from "@miragon/team-topologies-schema-model";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import { toast } from "@/ui/toast";

const STORAGE_KEY = "tt-modeler:document:v1";
const BACKUP_KEY = `${STORAGE_KEY}:previous`;

/** Only warn about a full quota once per session to avoid toast spam. */
let quotaWarned = false;

export type StoredDocumentResult =
  | { status: "absent" }
  | { status: "corrupt"; detail: string }
  | { status: "ok"; document: TtDocument };

export function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22)
  );
}

function warnStorageFull(): void {
  if (quotaWarned) return;
  quotaWarned = true;
  toast(
    "Browser storage is full, so autosave is paused. Export your diagram as JSON to keep it safe.",
    "error",
    { sticky: true },
  );
}

function writeSlot(key: string, doc: TtDocument): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, serializeDocument(doc, false));
    return true;
  } catch (err) {
    if (isQuotaError(err)) warnStorageFull();
    return false;
  }
}

function readSlot(key: string): StoredDocumentResult {
  if (!hasStorage()) return { status: "absent" };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { status: "absent" };
    const parsed = parseDocument(JSON.parse(raw));
    return parsed.ok
      ? { status: "ok", document: parsed.document }
      : { status: "corrupt", detail: parsed.error };
  } catch (err) {
    return { status: "corrupt", detail: err instanceof Error ? err.message : String(err) };
  }
}

function removeSlot(key: string): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function saveToStorage(doc: TtDocument): void {
  writeSlot(STORAGE_KEY, doc);
}

export function loadFromStorage(): StoredDocumentResult {
  return readSlot(STORAGE_KEY);
}

export function clearStorage(): void {
  removeSlot(STORAGE_KEY);
}

/** Returns false when the backup could not be written (no storage, or storage full). */
export function saveBackup(doc: TtDocument): boolean {
  return writeSlot(BACKUP_KEY, doc);
}

export function loadBackup(): TtDocument | null {
  const stored = readSlot(BACKUP_KEY);
  return stored.status === "ok" ? stored.document : null;
}

export function clearBackup(): void {
  removeSlot(BACKUP_KEY);
}
