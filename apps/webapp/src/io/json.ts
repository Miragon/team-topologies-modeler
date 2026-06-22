/** Import/export of the native, lossless `.ttm.json` document format. */

import { serializeDocument } from "@miragon/team-topologies-schema-model";
import { parseDocument, type ParseResult } from "@miragon/team-topologies-schema-model";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import { downloadBlob, slugify } from "./download";

export const JSON_EXTENSION = ".ttm.json";

export function exportJson(doc: TtDocument): void {
  const json = serializeDocument(doc, true);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(`${slugify(doc.title)}${JSON_EXTENSION}`, blob);
}

export async function importJsonFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    return parseDocument(JSON.parse(text));
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not read file",
    };
  }
}
