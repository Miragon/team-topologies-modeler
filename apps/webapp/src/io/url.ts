/**
 * Encode/decode a whole diagram into a URL hash so it can be shared with a
 * single link, no backend required. The document is serialised deterministically
 * and LZ-compressed for compact, stable URLs.
 */

import LZString from "lz-string";
import { serializeDocument } from "@miragon/team-topologies-schema-model";
import { parseDocument } from "@miragon/team-topologies-schema-model";
import type { TtDocument } from "@miragon/team-topologies-schema-model";

const HASH_KEY = "d";

/**
 * What the address bar carries: no diagram, a diagram that can't be read (truncated or edited
 * link), or a valid one. A broken link must not look like "no link", or the user never learns
 * why they see something else.
 */
export type HashDocumentResult =
  | { status: "absent" }
  | { status: "invalid"; detail: string }
  | { status: "ok"; document: TtDocument };

export function encodeDocumentToHash(doc: TtDocument): string {
  const json = serializeDocument(doc, false);
  return LZString.compressToEncodedURIComponent(json);
}

export function buildShareUrl(doc: TtDocument, base?: string): string {
  const origin =
    base ??
    (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "");
  return `${origin}#${HASH_KEY}=${encodeDocumentToHash(doc)}`;
}

/** Reads a document from a raw location hash (e.g. `#d=...`). */
export function decodeDocumentFromHash(hash: string): HashDocumentResult {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return { status: "absent" };
  const params = new URLSearchParams(raw);
  if (!params.has(HASH_KEY)) return { status: "absent" };
  const encoded = params.get(HASH_KEY);
  if (!encoded) return { status: "invalid", detail: "The link has no diagram data." };
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return { status: "invalid", detail: "The diagram data could not be decompressed." };
    const parsed = parseDocument(JSON.parse(json));
    return parsed.ok
      ? { status: "ok", document: parsed.document }
      : { status: "invalid", detail: parsed.error };
  } catch (error) {
    return {
      status: "invalid",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function readDocumentFromLocation(): HashDocumentResult {
  if (typeof window === "undefined") return { status: "absent" };
  return decodeDocumentFromHash(window.location.hash);
}

/**
 * Browsers handle very long URLs poorly (and some proxies/servers cap them).
 * Above this we keep the address bar untouched and rely on localStorage; the
 * Share button can still produce a link explicitly.
 */
const MAX_HASH_LENGTH = 30_000;

/**
 * Mirror the current document into the address-bar hash (`#d=…`) without a
 * reload, so the URL is always a shareable/bookmarkable snapshot. Returns
 * `false` when the payload is too large to keep in the URL.
 */
export function writeDocumentToLocation(doc: TtDocument): boolean {
  if (typeof window === "undefined") return false;
  const encoded = encodeDocumentToHash(doc);
  if (encoded.length > MAX_HASH_LENGTH) {
    clearLocationHash();
    return false;
  }
  const url = `${window.location.pathname}${window.location.search}#${HASH_KEY}=${encoded}`;
  window.history.replaceState(null, "", url);
  return true;
}

/** Removes the `#d=...` payload from the address bar without reloading. */
export function clearLocationHash(): void {
  if (typeof window === "undefined") return;
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
}
