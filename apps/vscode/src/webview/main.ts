// Import order is cascade order: the renderer CSS (with diagram-js.css and the --cd-* tokens) and
// the ui package's CSS arrive through these indexes ahead of style.css, so the webview's own rules win.
import { Modeler, iconMarkup } from "@miragon/team-topologies-renderer";
import { legendCrowdsCanvas, makeRoomForLegend } from "@miragon/team-topologies-ui";
import { parseDocument, serializeDocument } from "@miragon/team-topologies-schema-model";
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type Selection from "diagram-js/lib/features/selection/Selection";
import "@fontsource-variable/geist/wght.css";
import "./style.css";
import { embedSvg, svgToEmbeddedPng, blobToBase64 } from "./io.js";
import { ICON_CIRCLE_X, ICON_FILE_CODE_CORNER, ICON_FILE_IMAGE, ICON_SHAPES } from "./icons.js";
import { createLegendState } from "./legendState.js";
import { mountMenu, type MenuAction } from "./menu.js";
import { mountPanels } from "./panels.js";
import { mountZoomControl } from "./zoomControl.js";
import type { HostToWebview, WebviewToHost } from "../protocol.js";

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare const acquireVsCodeApi: () => VsCodeApi;
const vscode = acquireVsCodeApi();

const app = document.getElementById("app");
const container = document.getElementById("canvas");
const toolbar = document.getElementById("toolbar");
const panels = document.getElementById("panels");
if (!app || !container || !toolbar || !panels) {
  throw new Error("Webview layout incomplete (#app/#canvas/#toolbar/#panels).");
}

const modeler = new Modeler({ container });
// Debug handle (like the webapp). Harmless in the sandboxed webview, helpful for diagnostics/tests.
(globalThis as Record<string, unknown>).__ttModeler = modeler;

// ---------------------------------------------------------------------------
// Chrome. The menu has no undo/redo: VS Code's own Ctrl/Cmd+Z drives the document history.
// ---------------------------------------------------------------------------

const legend = createLegendState(vscode, () => !legendCrowdsCanvas());

const legendEntry: MenuAction = {
  label: "Legend",
  icon: ICON_SHAPES,
  checked: legend.isOpen(),
  onSelect: () => {
    const open = !legend.isOpen();
    if (open) makeRoomForLegend(modeler);
    legend.setOpen(open);
  },
};

const menu = mountMenu(toolbar, [
  legendEntry,
  "separator",
  { label: "Export as PNG", icon: ICON_FILE_IMAGE, onSelect: () => void exportPng() },
  { label: "Export as SVG", icon: ICON_FILE_CODE_CORNER, onSelect: exportSvg },
]);
legend.subscribe(() => menu.setChecked(legendEntry, legend.isOpen()));

mountZoomControl(app, modeler);

const panelsHandle = mountPanels(panels, { modeler, legend, focusMenuTrigger: menu.focusTrigger });

// While the text is unparsable, edits can't be written back (pushEdit is blocked). The canvas says
// so instead of dropping them silently, and the inspector stops taking changes that would be lost.
const invalidFileNotice = document.createElement("div");
invalidFileNotice.className = "notice";
invalidFileNotice.setAttribute("role", "status");
app.append(invalidFileNotice);

function setInvalidFileNotice(visible: boolean): void {
  if (visible === invalidFileNotice.hasChildNodes()) return;
  panelsHandle.setReadOnly(visible);
  if (!visible) {
    invalidFileNotice.replaceChildren();
    return;
  }
  const text = document.createElement("span");
  text.textContent =
    "This file isn't a valid diagram right now, so changes on the canvas aren't saved. Fix the text to keep editing.";
  invalidFileNotice.innerHTML = iconMarkup(ICON_CIRCLE_X, { className: "notice__icon" });
  invalidFileNotice.append(text);
}

// ---------------------------------------------------------------------------
// Two-way sync with the document (native JSON is the source of truth)
// ---------------------------------------------------------------------------

/**
 * Every keystroke in the text editor arrives as its own `update`, each failing at a different
 * position; waiting for a pause raises one notification instead of one per keystroke.
 */
const PARSE_ERROR_NOTIFY_DELAY_MS = 800;

let lastText = ""; // text last reconciled with the host
let importing = false; // suppresses the edit echo during import
let importFailed = false; // the last import (e.g. externally typed text) was unparsable
let initialized = false; // first init done -> preserve zoom/viewport from then on
let parseErrorTimer: number | undefined;
let parseErrorNotified = false; // one notification per stretch of invalid text

// Serialize imports STRICTLY: init/update arrive as (un-awaited) messages; without chaining, two
// quick updates (e.g. several undos) could import concurrently and finish in the wrong order. The
// PNG save (respondPng) also hooks onto this chain, so a half-imported state is never rasterized.
let importChain: Promise<void> = Promise.resolve();
function enqueueImport(text: string, fit: boolean): Promise<void> {
  importChain = importChain.then(() => importText(text, fit)).catch(() => {});
  return importChain;
}

/** Parse the document text; throws a descriptive error on invalid JSON or a schema violation. */
function parse(text: string): TtDocument {
  const value = text.trim() === "" ? {} : JSON.parse(text);
  const result = parseDocument(value);
  if (!result.ok) throw new Error(result.error);
  return result.document;
}

/** Canonical, comparable JSON of the current canvas state. */
function currentText(): string {
  return serializeDocument(modeler.exportDocument(), true);
}

/**
 * Loads `text` into the modeler. `fit=true` (first load) keeps the fit that `importDocument` does;
 * `fit=false` (external or echo-missed change) PRESERVES the current zoom/viewport — otherwise every
 * change mirrored back by the host (e.g. an `insertFinalNewline` appended on save) would reset the
 * zoom. If the incoming `update` describes the same diagram as the current state, it is not
 * re-imported at all.
 */
async function importText(text: string, fit: boolean): Promise<void> {
  let doc: TtDocument;
  try {
    doc = parse(text);
  } catch (err) {
    // Parse error: the canvas keeps showing the last good diagram. Block pushEdit so a graphical
    // action doesn't overwrite the (just externally typed) unparsable text — until a successful
    // re-import (valid 'update') restores a known state.
    markImportFailed((err as Error).message, { notifyNow: fit });
    return;
  }

  if (!fit && initialized && serializeDocument(doc, true) === currentText()) {
    lastText = text;
    markImportSucceeded();
    return;
  }

  importing = true;
  const prevView = fit ? undefined : currentViewbox();
  const prevSelection = selectedIds();
  try {
    modeler.importDocument(doc);
    lastText = text;
    markImportSucceeded();
    if (prevView) restoreViewbox(prevView);
    reselect(prevSelection);
  } finally {
    importing = false;
    initialized = true;
  }
}

function markImportFailed(detail: string, { notifyNow }: { notifyNow: boolean }): void {
  importFailed = true;
  setInvalidFileNotice(true);
  if (parseErrorNotified) return;
  window.clearTimeout(parseErrorTimer);
  const notify = (): void => {
    parseErrorTimer = undefined;
    parseErrorNotified = true;
    vscode.postMessage({
      type: "error",
      message: `Couldn't read this file as a Team Topologies diagram (${detail}). Fix the text and the diagram editor picks it up again.`,
    });
  };
  if (notifyNow) notify();
  else parseErrorTimer = window.setTimeout(notify, PARSE_ERROR_NOTIFY_DELAY_MS);
}

function markImportSucceeded(): void {
  importFailed = false;
  window.clearTimeout(parseErrorTimer);
  parseErrorTimer = undefined;
  parseErrorNotified = false;
  setInvalidFileNotice(false);
}

/** Graphical change -> serialize JSON and (only on a real difference) report it to the host. */
function pushEdit(): void {
  if (importing || importFailed) return;
  const text = currentText();
  if (text === lastText) return;
  lastText = text;
  vscode.postMessage({ type: "edit", text });
}

modeler.on("commandStack.changed", pushEdit);

window.addEventListener("message", (event: MessageEvent<HostToWebview>) => {
  const msg = event.data;
  if (msg.type === "init") void enqueueImport(msg.text, true);
  else if (msg.type === "update") void enqueueImport(msg.text, false);
  else if (msg.type === "requestPng") void respondPng(msg.id, msg.includeDraft);
  else if (msg.type === "flush") void respondFlush(msg.id);
});

/**
 * An inspector field commits its draft on blur, and a save shortcut doesn't move the focus, so the
 * save would miss text the user can see. Blurring and refocusing commits it without losing the
 * caret. Only while this document has focus: when it lost focus the field already blurred, and
 * refocusing it then would pull the focus back from the rest of VS Code.
 */
function commitPanelDraft(): void {
  const active = document.activeElement;
  if (!document.hasFocus() || !(active instanceof HTMLElement) || !panels?.contains(active)) {
    return;
  }
  active.blur();
  active.focus({ preventScroll: true });
}

/** The text editor is about to save: commit a draft (its `edit` goes out first), then answer. */
async function respondFlush(id: number): Promise<void> {
  await importChain;
  commitPanelDraft();
  vscode.postMessage({ type: "flushed", id });
}

/**
 * PNG editor: the host requests the finished, embedded PNG (save/backup). We rasterize the current
 * state and send back Base64 — errors are reported as `error` so the host can cleanly abort the save
 * instead of writing a corrupt file. First wait for all imports queued up to this point so a
 * currently running init/update doesn't rasterize a half-imported state into the PNG.
 */
async function respondPng(id: number, includeDraft: boolean): Promise<void> {
  try {
    await importChain;
    if (includeDraft) commitPanelDraft();
    const { svg } = modeler.saveSVG();
    const blob = await svgToEmbeddedPng(svg, currentText());
    vscode.postMessage({ type: "pngResponse", id, data: await blobToBase64(blob) });
  } catch (err) {
    vscode.postMessage({ type: "pngResponse", id, error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Viewport helpers
// ---------------------------------------------------------------------------

type ViewBox = { x: number; y: number; width: number; height: number };

function currentViewbox(): ViewBox | undefined {
  try {
    const vb = modeler.get<Canvas>("canvas").viewbox();
    return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
  } catch {
    return undefined;
  }
}

function restoreViewbox(box: ViewBox): void {
  try {
    modeler.get<Canvas>("canvas").viewbox(box);
  } catch {
    /* no canvas yet -> ignore */
  }
}

// ---------------------------------------------------------------------------
// Selection across re-imports (VS Code undo/redo, edits in the text editor)
// ---------------------------------------------------------------------------

function selectedIds(): string[] {
  return modeler
    .get<Selection>("selection")
    .get()
    .map((element) => element.id);
}

/**
 * An import replaces every element object and clears the selection. Selecting the same ids again
 * keeps the inspector on the element it was editing; ids the new text no longer has drop out.
 */
function reselect(ids: readonly string[]): void {
  if (ids.length === 0) return;
  const registry = modeler.get<ElementRegistry>("elementRegistry");
  const elements = ids.flatMap((id) => registry.get(id) ?? []);
  if (elements.length > 0) modeler.get<Selection>("selection").select(elements);
}

// ---------------------------------------------------------------------------
// Export (the webview rasterizes/serializes; the host shows the save dialog)
// ---------------------------------------------------------------------------

function exportSvg(): void {
  try {
    const { svg } = modeler.saveSVG();
    vscode.postMessage({ type: "export", format: "svg", data: embedSvg(svg, currentText()) });
  } catch (err) {
    vscode.postMessage({
      type: "error",
      message: `Couldn't export the SVG (${(err as Error).message}). Try again, or export as PNG.`,
    });
  }
}

async function exportPng(): Promise<void> {
  try {
    const { svg } = modeler.saveSVG();
    const blob = await svgToEmbeddedPng(svg, currentText());
    vscode.postMessage({ type: "export", format: "png", data: await blobToBase64(blob) });
  } catch (err) {
    vscode.postMessage({
      type: "error",
      message: `Couldn't export the PNG (${(err as Error).message}). Try again, or export as SVG.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

vscode.postMessage({ type: "ready" });
