// Pulls the renderer CSS (incl. diagram-js.css) into the bundle via the renderer's index.
import { Modeler } from "@tt-modeler/renderer";
import { parseDocument, serializeDocument } from "@tt-modeler/schema-model";
import type { TtDocument } from "@tt-modeler/schema-model";
import "./style.css";
import { embedSvg, svgToEmbeddedPng, blobToBase64 } from "./io.js";
import type { HostToWebview, WebviewToHost } from "../protocol.js";

interface VsCodeApi {
  postMessage(msg: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare const acquireVsCodeApi: () => VsCodeApi;
const vscode = acquireVsCodeApi();

const container = document.getElementById("canvas");
const toolbar = document.getElementById("toolbar");
if (!container || !toolbar) throw new Error("Webview layout incomplete (#canvas/#toolbar).");

const modeler = new Modeler({ container });
// Debug handle (like the webapp). Harmless in the sandboxed webview, helpful for diagnostics/tests.
(globalThis as Record<string, unknown>).__ttModeler = modeler;

// ---------------------------------------------------------------------------
// Two-way sync with the document (native JSON is the source of truth)
// ---------------------------------------------------------------------------

let lastText = ""; // text last reconciled with the host
let importing = false; // suppresses the edit echo during import
let importFailed = false; // the last import (e.g. externally typed text) was unparsable
let initialized = false; // first init done -> preserve zoom/viewport from then on

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
 * Loads `text` into the modeler. `fit=true` (first load) fits the diagram; `fit=false` (external or
 * echo-missed change) PRESERVES the current zoom/viewport — otherwise every change mirrored back by
 * the host (e.g. an `insertFinalNewline` appended on save) would reset the zoom. If the incoming
 * `update` describes the same diagram as the current state, it is not re-imported at all.
 */
async function importText(text: string, fit: boolean): Promise<void> {
  let doc: TtDocument;
  try {
    doc = parse(text);
  } catch (err) {
    // Parse error: the canvas keeps showing the last good diagram. Block pushEdit so a graphical
    // action doesn't overwrite the (just externally typed) unparsable text — until a successful
    // re-import (valid 'update') restores a known state.
    importFailed = true;
    vscode.postMessage({
      type: "error",
      message: `Could not parse this Team Topologies file: ${(err as Error).message}`,
    });
    return;
  }

  if (!fit && initialized && serializeDocument(doc, true) === currentText()) {
    lastText = text;
    importFailed = false;
    return;
  }

  importing = true;
  const prevView = fit ? undefined : currentViewbox();
  try {
    modeler.importDocument(doc);
    lastText = text;
    importFailed = false;
    if (fit) fitView();
    else if (prevView) restoreViewbox(prevView);
  } finally {
    importing = false;
    initialized = true;
  }
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
  else if (msg.type === "requestPng") void respondPng(msg.id);
});

/**
 * PNG editor: the host requests the finished, embedded PNG (save/backup). We rasterize the current
 * state and send back Base64 — errors are reported as `error` so the host can cleanly abort the save
 * instead of writing a corrupt file. First wait for all imports queued up to this point so a
 * currently running init/update doesn't rasterize a half-imported state into the PNG.
 */
async function respondPng(id: number): Promise<void> {
  try {
    await importChain;
    deselect();
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

interface Canvas {
  viewbox(box?: ViewBox): ViewBox;
  zoom(mode: string): void;
}
type ViewBox = { x: number; y: number; width: number; height: number };

function fitView(): void {
  try {
    modeler.get<Canvas>("canvas").zoom("fit-viewport");
  } catch {
    /* no canvas yet -> ignore */
  }
}

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

function deselect(): void {
  modeler.get<{ select: (e: unknown) => void }>("selection").select(null);
}

// ---------------------------------------------------------------------------
// Menu (collapsed hamburger top right, Excalidraw style). NO undo/redo — VS Code handles that via
// Ctrl/Cmd+Z out of the box (the modeler's keyboard service is bound within the webview canvas).
// ---------------------------------------------------------------------------

function setMenuOpen(open: boolean): void {
  dropdown.hidden = !open;
  menuBtn.setAttribute("aria-expanded", String(open));
}

function menuItem(label: string, onClick: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "menu-item";
  item.setAttribute("role", "menuitem");
  item.textContent = label;
  item.addEventListener("click", () => {
    setMenuOpen(false);
    onClick();
  });
  return item;
}

function menuSep(): HTMLDivElement {
  const sep = document.createElement("div");
  sep.className = "menu-sep";
  sep.setAttribute("role", "separator");
  return sep;
}

const menuBtn = document.createElement("button");
menuBtn.type = "button";
menuBtn.className = "menu-btn";
menuBtn.title = "Menu";
menuBtn.setAttribute("aria-label", "Menu");
menuBtn.setAttribute("aria-haspopup", "true");
menuBtn.setAttribute("aria-expanded", "false");
menuBtn.textContent = "☰";

const dropdown = document.createElement("div");
dropdown.className = "menu-dropdown";
dropdown.setAttribute("role", "menu");
dropdown.hidden = true;

dropdown.append(
  menuItem("Fit to view", fitView),
  menuSep(),
  menuItem("Export · SVG", exportSvg),
  menuItem("Export · PNG", exportPng),
);

toolbar.append(menuBtn, dropdown);

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenuOpen(dropdown.hidden === true);
});
document.addEventListener("click", (e) => {
  if (!(e.target as Element | null)?.closest("#toolbar")) setMenuOpen(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenuOpen(false);
});

// ---------------------------------------------------------------------------
// Export (the webview rasterizes/serializes; the host shows the save dialog)
// ---------------------------------------------------------------------------

function exportSvg(): void {
  deselect();
  try {
    const { svg } = modeler.saveSVG();
    vscode.postMessage({ type: "export", format: "svg", data: embedSvg(svg, currentText()) });
  } catch (err) {
    vscode.postMessage({ type: "error", message: `SVG export failed: ${(err as Error).message}` });
  }
}

async function exportPng(): Promise<void> {
  deselect();
  try {
    const { svg } = modeler.saveSVG();
    const blob = await svgToEmbeddedPng(svg, currentText());
    vscode.postMessage({ type: "export", format: "png", data: await blobToBase64(blob) });
  } catch (err) {
    vscode.postMessage({ type: "error", message: `PNG export failed: ${(err as Error).message}` });
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

vscode.postMessage({ type: "ready" });
