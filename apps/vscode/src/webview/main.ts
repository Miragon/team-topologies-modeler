// First: zod must not probe for eval once the CSP is in place (see zod-jitless.ts).
import "./zod-jitless.js";
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
// The renderer's stylesheet brings the tokens, diagram-js.css and cd-canvas.css, the ui package
// its content styles; the shell's stylesheet comes last.
import {
  createCollaborativeModeler,
  isTtElement,
  parseDocumentText,
  type CollaborativeTeamTopologiesModeler,
  type Modeler,
  type TtReadOnly,
} from "@miragon/team-topologies-renderer";
import { serializeDocument } from "@miragon/team-topologies-schema-model";
import {
  createShortcutsDialog,
  diagramMenu,
  makeRoomForLegend,
  mountInspector,
  renderLegendRows,
} from "@miragon/team-topologies-ui";
import "@miragon/modeler-shell/shell.css";
import type { ShellHandle } from "@miragon/modeler-shell";
import { INVALID_STATUS_DELAY_MS } from "@miragon/modeler-shell/core";
import {
  connectDiagramJs,
  shellModule,
  type DiagramJsConnection,
} from "@miragon/modeler-shell/diagram-js";
import {
  mountVsCodeShell,
  persistView,
  readShellState,
  writeShellState,
} from "@miragon/modeler-shell/vscode/webview";
import type { HostToWebview, WebviewCommand, WebviewToHost } from "../protocol.js";
import { WEBVIEW_THEMES } from "../themes.js";
import { blobToBase64, embedSvg, svgToEmbeddedPng } from "./io.js";
import { takeLegacyLegendOpen } from "./state.js";

interface VsCodeApi {
  postMessage(message: WebviewToHost): void;
  getState(): unknown;
  setState(state: unknown): void;
}
declare const acquireVsCodeApi: () => VsCodeApi;

interface DiagramElement {
  id: string;
}
interface ElementRegistryLike {
  getAll(): DiagramElement[];
  get(id: string): DiagramElement | undefined;
}
interface SelectionLike {
  get(): DiagramElement[];
  select(elements: DiagramElement[] | null): void;
}
const DIAGRAM_NAME = "Team Topologies diagram";

const vscode = acquireVsCodeApi();
const storedShellState = readShellState(vscode);
const legacyLegendOpen = takeLegacyLegendOpen(vscode);
if (storedShellState.legendOpen === undefined && legacyLegendOpen !== undefined) {
  writeShellState(vscode, { legendOpen: legacyLegendOpen });
}

// The diagram first: the renderer's keyboard listens on document and must run before the shell's
// key listener. Undo and redo keys stay unbound: VS Code's document history owns them (guide
// §13.5). The shell's viewport fits, so the contract's own fit after every import stays off.
// Keyboard creation asks the shell's viewport for the free centre; it exists once the shell is
// connected below, long before a palette entry can fire.
const collaborative = createCollaborativeModeler({
  additionalModules: [shellModule],
  undoRedoKeys: false,
  fitOnImport: false,
  freeArea: { center: () => connection.viewport.freeRectCenter() },
});
const modeler = collaborative.diagram as Modeler;
modeler.get("canvas");
const registry = modeler.get<ElementRegistryLike>("elementRegistry");
const selection = modeler.get<SelectionLike>("selection");
const canvasLock = modeler.get<TtReadOnly>("ttReadOnly");

const app = document.getElementById("app");
if (!app) throw new Error("The webview HTML has no #app root.");

const shell: ShellHandle = mountVsCodeShell(app, {
  themes: WEBVIEW_THEMES,
  canvas: modeler.container,
  messages: { canvas: DIAGRAM_NAME },
  menu: diagramMenu({
    exportPng: () => void exportPng(),
    exportSvg: () => exportSvg(),
    showKeyboardShortcuts: () => shortcutsDialog.open(),
  }),
  legend: {
    render: renderLegendRows,
    open: storedShellState.legendOpen ?? legacyLegendOpen,
    onToggle: (open) => {
      // A bottom sheet hides the legend; asking for the legend closes the sheet.
      if (open) makeRoomForLegend(modeler);
      writeShellState(vscode, { legendOpen: open });
    },
  },
  inspector: { label: "Properties" },
  problems: { onActivate: () => post({ type: "showProblems" }) },
  emptyHint: { onInsertExample: () => post({ type: "insertExample" }) },
});
if (!shell.inspector) throw new Error("The shell mounted no inspector slot.");
const inspector = mountInspector(shell.inspector, modeler);
// The modeler's own content in the shell root goes with the diagram (the shell removes only its own).
const shortcutsDialog = createShortcutsDialog(shell);
modeler.on("diagram.destroy", () => {
  shortcutsDialog.destroy();
  inspector.destroy();
});

// A cheap test only: the shell asks on every content change. The shell fits to the content bounds
// the renderer reports (contract 1.3), tight, so its fit insets are the only margin (§5.9).
const isEmpty = (): boolean => !registry.getAll().some(isTtElement);

const connection: DiagramJsConnection = connectDiagramJs(shell, modeler, {
  modeler: collaborative,
  isEmpty,
});
const { viewport } = connection;
persistView(vscode, viewport);

// ---------------------------------------------------------------------------
// Two-way sync with the document (native JSON is the source of truth)
// ---------------------------------------------------------------------------

let lastText = ""; // text last reconciled with the host
let initialized = false; // the first import settled; from then on the view and selection stay

function post(message: WebviewToHost): void {
  vscode.postMessage(message);
}

/** True when `text` describes the diagram the canvas shows (only formatting differs). */
function showsText(text: string): boolean {
  try {
    return serializeDocument(parseDocumentText(text)) === collaborative.exportText();
  } catch {
    return false;
  }
}

function selectedIds(): string[] {
  return selection.get().map((element) => element.id);
}

/**
 * An import replaces every element object and clears the selection. Selecting the same ids again
 * keeps the inspector on the element it was editing; ids the new text no longer has drop out.
 */
function reselect(ids: readonly string[]): void {
  const elements = ids
    .map((id) => registry.get(id))
    .filter((element): element is DiagramElement => element !== undefined);
  if (elements.length > 0) selection.select(elements);
}

function showValidDiagram(): void {
  canvasLock.setReadOnly(false);
  shell.setReadOnly(false);
  shell.setStatus(null);
  inspector.setReadOnly(false);
}

function showInvalidDiagram(): void {
  // Locked at once, so no edit on the canvas overwrites the text the user is fixing; the marks and
  // the status box follow after 800ms without a valid import, so typing in the text editor neither
  // flickers nor re-announces the alert (guide §13.5).
  canvasLock.setReadOnly(true);
  inspector.setReadOnly(true);
  shell.setReadOnly(true, { delayMs: INVALID_STATUS_DELAY_MS });
  shell.setStatus(
    { severity: "danger", text: shell.messages.invalidFile(DIAGRAM_NAME) },
    { delayMs: INVALID_STATUS_DELAY_MS },
  );
}

/**
 * Loads `text` into the modeler. The first import takes the stored view or fits; every later one
 * (a host undo, the text editor, Git) keeps viewbox and selection. An update that describes the
 * diagram the canvas already shows (only formatting differs, e.g. `insertFinalNewline` on save) is
 * not re-imported at all.
 */
async function importText(text: string): Promise<void> {
  const first = !initialized;
  if (!first && showsText(text)) {
    lastText = text;
    showValidDiagram();
    return;
  }
  const keep = first ? undefined : viewport.getViewbox();
  const selected = first ? [] : selectedIds();
  try {
    await collaborative.importText(text);
    lastText = text;
    showValidDiagram();
    if (keep) viewport.restore(keep);
    else if (first && storedShellState.view) viewport.setState(storedShellState.view);
    reselect(selected);
    viewport.afterImport();
    shell.menu.refresh();
  } catch {
    showInvalidDiagram();
  } finally {
    initialized = true;
  }
}

// Strictly serialized: init/update arrive as un-awaited messages, and two quick updates (several
// undos) must not import concurrently and finish in the wrong order. The PNG save (respondPng)
// also hooks onto this chain, so a half-imported state is never rasterized.
let importChain: Promise<void> = Promise.resolve();
function enqueueImport(text: string): Promise<void> {
  importChain = importChain
    .then(() => importText(text))
    .catch((error: unknown) => console.error("Team Topologies import failed", error));
  return importChain;
}

/** Graphical change -> serialize JSON and (only on a real difference) report it to the host. */
function pushEdit(): void {
  // Before the first import the canvas does not show the document yet; read-only: it shows the
  // last valid diagram. Either way an edit would overwrite text the canvas never saw.
  if (!initialized || shell.isReadOnly()) return;
  const text = collaborative.exportText();
  if (text === lastText) return;
  lastText = text;
  post({ type: "edit", text });
}

collaborative.onContentChanged(pushEdit);
modeler.on("commandStack.changed", () => shell.menu.refresh());

/**
 * An inspector field commits its draft on blur, and a save shortcut doesn't move the focus, so the
 * save would miss text the user can see. Blurring and refocusing commits it without losing the
 * caret. Only while this document has focus: when it lost focus the field already blurred, and
 * refocusing it then would pull the focus back from the rest of VS Code.
 */
function commitPanelDraft(): void {
  const active = document.activeElement;
  const panel = shell.inspector?.element;
  if (!document.hasFocus() || !(active instanceof HTMLElement) || !panel?.contains(active)) {
    return;
  }
  active.blur();
  active.focus({ preventScroll: true });
}

/** The text editor is about to save: commit a draft (its `edit` goes out first), then answer. */
async function respondFlush(id: number): Promise<void> {
  await importChain;
  commitPanelDraft();
  post({ type: "flushed", id });
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
    const blob = await svgToEmbeddedPng(svg, collaborative.exportText());
    post({ type: "pngResponse", id, data: await blobToBase64(blob) });
  } catch (error) {
    post({ type: "pngResponse", id, error: messageOf(error) });
  }
}

// ---------------------------------------------------------------------------
// Export (the webview rasterizes/serializes; the host shows the save dialog)
// ---------------------------------------------------------------------------

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function exportSvg(): void {
  try {
    const { svg } = modeler.saveSVG();
    post({ type: "export", format: "svg", data: embedSvg(svg, collaborative.exportText()) });
  } catch (error) {
    post({
      type: "error",
      message: `Couldn't export the SVG (${messageOf(error)}). Try again, or export as PNG.`,
    });
  }
}

async function exportPng(): Promise<void> {
  try {
    const { svg } = modeler.saveSVG();
    const blob = await svgToEmbeddedPng(svg, collaborative.exportText());
    post({ type: "export", format: "png", data: await blobToBase64(blob) });
  } catch (error) {
    post({
      type: "error",
      message: `Couldn't export the PNG (${messageOf(error)}). Try again, or export as SVG.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Messages from the extension host
// ---------------------------------------------------------------------------

const COMMANDS: Readonly<Record<WebviewCommand, () => void>> = {
  fitView: () => viewport.fit(),
  exportPng: () => void exportPng(),
  exportSvg: () => exportSvg(),
};

function isHostMessage(data: unknown): data is HostToWebview {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { type?: unknown }).type === "string"
  );
}

let firstImportSettled: () => void = () => undefined;
const ready = new Promise<void>((resolve) => (firstImportSettled = resolve));

window.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!isHostMessage(event.data)) return;
  const message = event.data;
  switch (message.type) {
    case "init":
      void enqueueImport(message.text).then(firstImportSettled);
      break;
    case "update":
      void enqueueImport(message.text);
      break;
    case "problems":
      shell.setProblems({ count: message.count, errors: message.errors });
      break;
    case "command":
      // Only own entries: a name such as "constructor" must not reach Object.prototype.
      if (Object.hasOwn(COMMANDS, message.name)) COMMANDS[message.name]();
      break;
    case "requestPng":
      void respondPng(message.id, message.includeDraft);
      break;
    case "flush":
      void respondFlush(message.id);
      break;
  }
});

post({ type: "ready" });

/** For test pages: the mounted parts, and `ready` once the first `init` import settled. */
export const webview: {
  shell: ShellHandle;
  modeler: CollaborativeTeamTopologiesModeler;
  connection: DiagramJsConnection;
  ready: Promise<void>;
} = { shell, modeler: collaborative, connection, ready };
