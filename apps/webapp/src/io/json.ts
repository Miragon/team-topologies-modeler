/** Import/export of the native, lossless `.ttm.json` document format (also opened as `.tt`). */

import { serializeDocument } from "@miragon/team-topologies-schema-model";
import { parseDocument } from "@miragon/team-topologies-schema-model";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import { downloadBlob, slugify } from "./download";

export const JSON_EXTENSION = ".ttm.json";

/** `.tt` is the VS Code extension's default; `accept` is only a picker hint, so names are checked too. */
export const FILE_PICKER_ACCEPT = ".tt,.ttm.json,.json,application/json";

const ACCEPTED_FILE_NAME = /\.(tt|json)$/i;

export function isAcceptedFileName(name: string): boolean {
  return ACCEPTED_FILE_NAME.test(name);
}

export type FileImportFailure = "unreadable" | "not-a-diagram" | "invalid";

export type FileImportResult =
  { ok: true; document: TtDocument } | { ok: false; reason: FileImportFailure; detail: string };

export function exportJson(doc: TtDocument): void {
  const json = serializeDocument(doc, true);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(`${slugify(doc.title)}${JSON_EXTENSION}`, blob);
}

/**
 * The schema's migration fills defaults for any object, so a package.json would import as an empty
 * diagram and wipe the canvas. Requiring at least one diagram collection (or the version + title
 * header) keeps that guard here instead of in schema-model, whose migration the tt-format checker
 * mirrors.
 */
export function looksLikeTeamTopology(data: unknown): boolean {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const record = data as Record<string, unknown>;
  const hasCollection = ["nodes", "interactions", "flows", "annotations"].some((key) =>
    Array.isArray(record[key]),
  );
  return hasCollection || (typeof record.version === "number" && typeof record.title === "string");
}

export function parseDocumentText(text: string): FileImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      reason: "unreadable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  if (!looksLikeTeamTopology(data)) {
    return {
      ok: false,
      reason: "not-a-diagram",
      detail: "The JSON has none of nodes, interactions, flows or annotations.",
    };
  }
  const parsed = parseDocument(data);
  return parsed.ok
    ? { ok: true, document: parsed.document }
    : { ok: false, reason: "invalid", detail: parsed.error };
}

export async function importJsonFile(file: File): Promise<FileImportResult> {
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    return {
      ok: false,
      reason: "unreadable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
  return parseDocumentText(text);
}
