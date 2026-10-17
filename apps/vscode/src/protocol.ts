/**
 * Message protocol between the extension host and the webview.
 *
 * Data flow (classic CustomTextEditor pattern):
 *  - Host -> webview: `init`/`update` with the current document text (the native JSON document).
 *  - Webview -> host: `edit` after every graphical change (serialized JSON) -> WorkspaceEdit.
 *  - Webview -> host: `export` (SVG text or Base64 PNG) -> save dialog + write file.
 *  - Host -> webview: `flush` (with a correlation `id`) right before the text document is saved.
 *    The webview commits a field still being typed in (an `edit`), then answers `flushed`, so the
 *    save includes text that is visible but not yet committed.
 *
 * Only for the PNG editor (`*.tt.png`/`*.ttm.png`, binary CustomDocument file):
 *  - Host -> webview: `requestPng` (with a correlation `id`) when the host needs the fully
 *    rasterized PNG (raster + embedded JSON) for saving/backup — rasterization only works in the browser.
 *  - Webview -> host: `pngResponse` (`id` + Base64 PNG OR `error`).
 *
 * Echo protection: the host suppresses re-import when a document change exactly matches the JSON
 * last sent by the webview (otherwise every own change would reset the canvas). The webview, in
 * turn, only sends an `edit` when the JSON actually differs from the last known text.
 */

export type HostToWebview =
  /** Initial population after `ready`. */
  | { type: "init"; text: string }
  /** External document change (text editor, Git, …) -> re-import. */
  | { type: "update"; text: string }
  /**
   * PNG editor: request the current embedded PNG for save/backup (reply: `pngResponse`). With
   * `includeDraft` (a save, not a backup) a draft still being typed in the panels is committed first.
   */
  | { type: "requestPng"; id: number; includeDraft: boolean }
  /** About to save: commit any draft in the panels (reply: `flushed`, after its `edit`). */
  | { type: "flush"; id: number };

export type WebviewToHost =
  | { type: "ready" }
  /** Graphical change -> apply to the document as a WorkspaceEdit. */
  | { type: "edit"; text: string }
  /** Trigger an image export (SVG = text, PNG = Base64). */
  | { type: "export"; format: "svg" | "png"; data: string }
  /** Reply to `requestPng`: Base64 PNG (`data`) OR `error`. `id` correlates with the request. */
  | { type: "pngResponse"; id: number; data?: string; error?: string }
  /** Reply to `flush`: every `edit` it caused was posted before this. */
  | { type: "flushed"; id: number }
  | { type: "info"; message: string }
  | { type: "error"; message: string };
