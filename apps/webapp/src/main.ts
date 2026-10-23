// Geist and Geist Mono (Miragon's typefaces, SIL OFL), self-hosted: no font CDN (offline, GDPR).
import "@fontsource-variable/geist/wght.css";
import "@fontsource-variable/geist-mono/wght.css";
// The renderer's stylesheet brings the vendored tokens, diagram-js.css and cd-canvas.css, the ui
// package the content of inspector, legend and dialogs; the chrome's stylesheet comes last. The
// renderer's is imported here because the production build drops its entry's side-effect import.
import "@miragon/team-topologies-renderer/assets/team-topologies.css";
import "@miragon/team-topologies-ui/ui.css";
import "@miragon/modeler-shell/shell.css";
import {
  Modeler,
  isTtElement,
  type ImportWarning,
  type TtElement,
  type TtModeling,
} from "@miragon/team-topologies-renderer";
import {
  SAMPLE_DOCUMENT,
  emptyDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import {
  SHORTCUTS_DIALOG_KEY,
  createShortcutsDialog,
  createTitleDialog,
  diagramMenu,
  makeRoomForLegend,
  mountInspector,
  renderLegendRows,
} from "@miragon/team-topologies-ui";
import {
  TEXT_FIELD_SELECTOR,
  commandKeyLabel,
  defaultMessages,
  detectPlatform,
  formatNumber,
  isUndoRedoKey,
  mountShell,
  problemSummary,
  type MenuGroups,
  type ProblemItem,
  type ShellHandle,
  type ToastHandle,
} from "@miragon/modeler-shell";
import {
  connectDiagramJs,
  shellModule,
  type DiagramJsConnection,
} from "@miragon/modeler-shell/diagram-js";
import { isEmptyDocument, isSameDocument } from "./documents";
import { downloadPng, downloadSvg } from "./io/image";
import { FILE_PICKER_ACCEPT, exportJson, importJsonFile, isAcceptedFileName } from "./io/json";
import {
  buildShareUrl,
  clearLocationHash,
  readDocumentFromLocation,
  writeDocumentToLocation,
} from "./io/url";
import {
  autosave,
  loadFromStorage,
  loadPrevious,
  readLegendOpen,
  writeLegendOpen,
} from "./persistence";
import { importWarningsText, problemItems, remainingWarnings } from "./problems";
import { planStart } from "./start";
import { THEMES } from "./themes";

interface ElementRegistryLike {
  getAll(): unknown[];
  get(id: string): unknown;
}
interface SelectionLike {
  get(): unknown[];
  select(elements: unknown): void;
}
interface CanvasLike {
  scrollToElement(element: unknown): void;
}
/** Matches the static <title> in index.html. */
const APP_NAME = "Miragon Modeler for Team Topologies";
/** One line on the start card, as the other modelers' cards read. */
const START_TITLE = "Team Topologies Modeler";
const DIAGRAM_NAME = "Team Topologies diagram";
const REPOSITORY_URL = "https://github.com/Miragon/team-topologies-modeler";
/** Extensions for the drop; the MIME type decides while a file is dragged (guide §9). */
const DROP_TYPES = [".tt", ".ttm.json", ".json", "application/json"];
const AUTOSAVE_DELAY_MS = 600;
/** Short exports finish before this; only slower ones get a progress toast, so nothing flickers. */
const PROGRESS_TOAST_DELAY_MS = 300;
const BROKEN_LINK_TEXT =
  "This shared link is incomplete or damaged, so its diagram couldn't be opened. Ask the sender for a new link.";

const app = document.getElementById("app");
if (!app) throw new Error("index.html has no #app root.");

// 1. The diagram first: the renderer's keyboard listens on document and must run before the
//    chrome's key listener. The web app keeps the canvas's own undo and redo keys. The shell's
//    viewport fits, so imports pass `fit: false`; keyboard creation asks it for the free centre.
const modeler = new Modeler({
  height: "100%",
  additionalModules: [shellModule],
  freeArea: { center: () => connection.viewport.freeRectCenter() },
});
modeler.get("canvas");
const registry = modeler.get<ElementRegistryLike>("elementRegistry");
const selection = modeler.get<SelectionLike>("selection");
const canvas = modeler.get<CanvasLike>("canvas");

/** Whether the browser keeps a diagram the autosave wrote over (see `autosave`). */
let previousAvailable = hasPreviousDiagram();

const platform = detectPlatform(navigator);
const openKey = commandKeyLabel("O", platform, defaultMessages.keyNames);
const saveKey = commandKeyLabel("S", platform, defaultMessages.keyNames);

// 2. The chrome around it: the whole web column of guide §5.2.
const shell: ShellHandle = mountShell(app, {
  host: "web",
  canvas: modeler.container,
  lang: "en",
  platform,
  themes: THEMES,
  messages: { canvas: DIAGRAM_NAME },
  primary: { onSelect: () => share() },
  legal: { links: [{ label: "GitHub", href: REPOSITORY_URL }] },
  file: {
    newDiagram: { onSelect: () => newDiagram() },
    open: { onSelect: () => pickFile(), shortcut: openKey },
    showExample: { onSelect: () => showExample() },
  },
  menu: menuGroups(),
  legend: {
    render: renderLegendRows,
    open: readLegendOpen(),
    onToggle: (open) => {
      // A bottom sheet hides the legend; asking for the legend closes the sheet.
      if (open) makeRoomForLegend(modeler);
      writeLegendOpen(open);
    },
  },
  inspector: { label: "Properties" },
  problems: { onSelectItem: (item) => selectElement(item.elementId) },
  emptyState: {
    title: START_TITLE,
    text: "Start a new diagram, or explore the example.",
    komet: `${import.meta.env.BASE_URL}miragon-komet-blau.svg`,
    onNewDiagram: () => newDiagram(),
    onShowExample: () => showExample(),
    // The same types the reject toast names (the accept list's extensions).
    dropHint: "Or drop a .tt, .ttm.json, or .json file here",
  },
  dropZone: {
    accept: DROP_TYPES,
    onDrop: ([file]) => {
      if (file) void openFile(file);
    },
  },
});
if (!shell.inspector) throw new Error("The shell mounted no inspector slot.");
const inspector = mountInspector(shell.inspector, modeler);
// The modeler's own content in the shell root goes with the diagram (the shell removes only its own).
const shortcutsDialog = createShortcutsDialog(shell, { fileKeys: true });
const titleDialog = createTitleDialog(shell, {
  title: () => diagramTitle(),
  setTitle: (title) => modeler.get<TtModeling>("ttModeling").setTitle(title),
});
modeler.on("diagram.destroy", () => {
  shortcutsDialog.destroy();
  titleDialog.destroy();
  inspector.destroy();
});

/**
 * Model (Diagram title…; the shell adds Legend), Export and Help: the webview's entries plus what
 * only the web app has. The shell's File group takes no entries of a modeler's own, so "Restore
 * previous diagram" leads the Model group, next to File, while the browser keeps one.
 */
function menuGroups(): MenuGroups {
  const groups = diagramMenu({
    editTitle: () => titleDialog.open(),
    exportPng: () => void exportImage("png"),
    exportSvg: () => void exportImage("svg"),
    exportJson: () => exportJsonFile(),
    exportJsonShortcut: saveKey,
    showKeyboardShortcuts: () => shortcutsDialog.open(),
    keyboardShortcutsKey: SHORTCUTS_DIALOG_KEY,
  });
  if (!previousAvailable) return groups;
  return {
    ...groups,
    model: [
      {
        kind: "action",
        id: "restore-previous",
        label: "Restore previous diagram",
        onSelect: () => restorePreviousDiagram(),
      },
      ...(groups.model ?? []),
    ],
  };
}

// 3. Viewport, palette skin, keys. A cheap test only: the chrome asks on every content change. The
//    shell fits to the content bounds the renderer reports (contract 1.3), tight, so its fit
//    insets are the only margin (§5.9).
const isEmpty = (): boolean => !registry.getAll().some(isTtElement);

const connection: DiagramJsConnection = connectDiagramJs(shell, modeler, { modeler, isEmpty });
const { viewport } = connection;

// ---------------------------------------------------------------------------
// The browser's copy and the link: every change goes to both, shortly after it
// ---------------------------------------------------------------------------

function currentDocument(): TtDocument {
  return modeler.exportDocument();
}

function diagramTitle(): string {
  return modeler.getMeta()?.title ?? "";
}

/**
 * While a shared link shows a diagram that displaced the browser's own one (on a visit or pasted
 * into the open tab), the autosave keeps the own one until the shared one is edited: closing the
 * tab after a look at a colleague's link leaves the own work where it was.
 */
let keepStoredDiagram = false;
let storageFullAnnounced = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
/**
 * Counts the documents the canvas showed (each import starts one). The autosave writes over the
 * stored diagram freely only while it holds an earlier state of the shown document; a stored
 * diagram of another document becomes the previous diagram first.
 */
let shownDocument = 0;
let storedDocument: number | undefined;

function hasPreviousDiagram(): boolean {
  const previous = loadPrevious();
  return previous.status === "ok" && !isEmptyDocument(previous.document);
}

function setPreviousAvailable(available: boolean): void {
  if (previousAvailable === available) return;
  previousAvailable = available;
  shell.menu.setGroups(menuGroups());
}

function persistToStorage(doc: TtDocument): void {
  const { outcome, keptPrevious } = autosave(doc, storedDocument === shownDocument);
  if (keptPrevious) setPreviousAvailable(true);
  if (outcome === "saved") storedDocument = shownDocument;
  if (outcome === "full" && !storageFullAnnounced) {
    storageFullAnnounced = true;
    shell.toast({
      status: "danger",
      text: "Browser storage is full, so autosave is paused. Export your diagram as JSON to keep it safe.",
      action: { label: "Export JSON", onSelect: () => exportJsonFile() },
    });
  }
}

function persistNow(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const doc = currentDocument();
  if (!keepStoredDiagram) persistToStorage(doc);
  // An empty diagram keeps a clean URL; a link too long for the address bar is dropped from it.
  if (shell.isEmptyStateShown() || isEmptyDocument(doc)) clearLocationHash();
  else writeDocumentToLocation(doc);
}

function persistSoon(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, AUTOSAVE_DELAY_MS);
}

/** Closing or hiding the tab inside the debounce window would otherwise lose the last edit. */
function flushPersist(): void {
  if (saveTimer !== undefined) persistNow();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") flushPersist();
}

// ---------------------------------------------------------------------------
// Documents: every new diagram opens like the first (guide §5.9)
// ---------------------------------------------------------------------------

/** The tab names the diagram (guide §5.4: the web app's title names the file), else the app. */
function updateDocumentTitle(): void {
  const title = shell.isEmptyStateShown() ? "" : diagramTitle().trim();
  document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
}

let importWarnings: readonly ImportWarning[] = [];
/** The elements the import's warnings named and the diagram had then. */
let warnedElements: ReadonlySet<string> = new Set();

function diagramElement(id: string): TtElement | undefined {
  const element = registry.get(id);
  return isTtElement(element) ? element : undefined;
}

function showProblems(): ProblemItem[] {
  const warnings = remainingWarnings(importWarnings, warnedElements, (id) =>
    Boolean(diagramElement(id)),
  );
  const items = problemItems(warnings, (id) => {
    const element = diagramElement(id);
    return element ? { label: element.ttLabel } : undefined;
  });
  shell.setProblems(problemSummary(items));
  return items;
}

/**
 * Import warnings go to the problems pill and its list. A toast points at them after an import the
 * visitor started (open, drop, example, link), never after one that restores a diagram (guide §9).
 */
function reportWarnings(warnings: readonly ImportWarning[], announce: boolean): boolean {
  importWarnings = warnings;
  warnedElements = new Set(
    warnings.flatMap(({ elementId }) =>
      elementId && diagramElement(elementId) ? [elementId] : [],
    ),
  );
  const items = showProblems();
  for (const warning of warnings) console.warn("[tt-modeler] Import warning:", warning.message);
  if (!announce || items.length === 0) return false;
  const pill = shell.messages.problems(items.length, formatNumber(items.length, shell.lang));
  shell.toast({ status: "warning", text: importWarningsText(items.length, pill) });
  return true;
}

interface OpenOptions {
  /** The visitor started this import: its warnings get a toast. */
  announce: boolean;
  /** See `keepStoredDiagram`. */
  keepStoredDiagram?: boolean;
}

/**
 * Loads a diagram as a new document. Throws when the canvas cannot draw it; the renderer checks
 * the ids before it touches the canvas, so the previous diagram then still shows. Returns whether
 * a toast already reported warnings.
 */
function openDocument(doc: TtDocument, options: OpenOptions): boolean {
  viewport.newDocument();
  let warnings: ImportWarning[];
  try {
    ({ warnings } = modeler.importDocument(doc, { fit: false }));
  } finally {
    viewport.afterImport();
  }
  shownDocument += 1;
  keepStoredDiagram = options.keepStoredDiagram ?? false;
  shell.setEmptyState(false);
  shell.menu.refresh();
  updateDocumentTitle();
  const warned = reportWarnings(warnings, options.announce);
  persistNow();
  return warned;
}

interface ReplaceUndo {
  readonly toast: ToastHandle;
  run(): void;
}

let replaceUndo: ReplaceUndo | undefined;

/** An undo offer would bring back the replaced diagram and silently drop what came after it. */
function withdrawReplaceUndo(): void {
  replaceUndo?.toast.dismiss();
  replaceUndo = undefined;
}

interface ReplaceOptions extends OpenOptions {
  /** The file the diagram came from, named in the success toast. */
  fileName?: string;
}

/**
 * Replacing a diagram clears the canvas history, so instead of asking first (guide §9) every
 * replacement keeps the previous diagram and offers it back: "Diagram replaced · Undo", and
 * Cmd/Ctrl+Z while the canvas has nothing else to undo (the toast's button is far down the tab
 * order). An edit withdraws the offer.
 */
function replaceDiagram(next: TtDocument, options: ReplaceOptions): void {
  // A pending autosave belongs to the diagram that goes; one it should keep must be complete.
  flushPersist();
  const previous = currentDocument();
  let warned: boolean;
  try {
    warned = openDocument(next, options);
  } catch (error) {
    console.error("[tt-modeler] Could not display the diagram:", error);
    try {
      openDocument(previous, { announce: false, keepStoredDiagram });
    } catch (restoreError) {
      console.error("[tt-modeler] Could not display the previous diagram:", restoreError);
    }
    shell.toast({
      status: "danger",
      text: "Couldn't display this diagram, so your current one stays. Details in the console.",
    });
    return;
  }
  withdrawReplaceUndo();
  if (!isEmptyDocument(previous) && !isSameDocument(previous, currentDocument())) {
    const undo = (): void => {
      if (replaceUndo === offer) replaceUndo = undefined;
      try {
        openDocument(previous, { announce: false });
      } catch (error) {
        console.error("[tt-modeler] Could not bring the previous diagram back:", error);
        shell.toast({ status: "danger", text: "Couldn't bring the previous diagram back." });
      }
    };
    const offer: ReplaceUndo = {
      toast: shell.toast({
        status: "info",
        text: "Diagram replaced",
        action: { label: "Undo", onSelect: undo },
      }),
      run: () => {
        offer.toast.dismiss();
        undo();
      },
    };
    replaceUndo = offer;
    return;
  }
  if (options.fileName && !warned) {
    shell.toast({ status: "success", text: `Opened “${options.fileName}”` });
  }
}

function newDiagram(): void {
  replaceDiagram(emptyDocument(), { announce: false });
}

/** Swaps the shown diagram and the previous one, so a second restore takes it back. */
function restorePreviousDiagram(): void {
  const previous = loadPrevious();
  if (previous.status !== "ok") {
    if (previous.status === "corrupt") {
      console.warn("[tt-modeler] Ignoring a damaged previous diagram:", previous.detail);
    }
    setPreviousAvailable(false);
    shell.toast({
      status: "danger",
      text: "The previous diagram is no longer stored in this browser, so it can't be restored.",
    });
    return;
  }
  replaceDiagram(previous.document, { announce: true });
}

function showExample(): void {
  replaceDiagram(SAMPLE_DOCUMENT, { announce: true });
}

function quoted(text: string): string {
  return `“${text}”`;
}

/** Reads a file before the canvas is touched, then replaces the diagram with it. */
async function openFile(file: File): Promise<void> {
  const name = quoted(file.name);
  if (!isAcceptedFileName(file.name)) {
    shell.toast({
      status: "danger",
      text: `Can't open ${name}. Choose a .tt or .ttm.json file.`,
    });
    return;
  }
  const result = await importJsonFile(file);
  if (!result.ok) {
    console.warn(`[tt-modeler] Could not open "${file.name}":`, result.detail);
    const text = {
      unreadable: `Couldn't read ${name}. Check that the file contains a valid diagram.`,
      "not-a-diagram": `${name} doesn't contain a Team Topologies diagram. Choose a .tt or .ttm.json file.`,
      invalid: `Couldn't open ${name} because the diagram in it is invalid. Details in the console.`,
    }[result.reason];
    shell.toast({ status: "danger", text });
    return;
  }
  replaceDiagram(result.document, { announce: true, fileName: file.name });
}

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = FILE_PICKER_ACCEPT;
fileInput.hidden = true;
document.body.append(fileInput);
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (file) void openFile(file);
});

function pickFile(): void {
  fileInput.click();
}

function selectElement(id: string | undefined): void {
  const element = id ? registry.get(id) : undefined;
  if (!element) return;
  selection.select(element);
  canvas.scrollToElement(element);
}

// ---------------------------------------------------------------------------
// Share and export
// ---------------------------------------------------------------------------

function copyText(text: string): Promise<void> {
  const clipboard = navigator.clipboard as Clipboard | undefined;
  if (!clipboard) return Promise.reject(new Error("The clipboard is not available here."));
  return clipboard.writeText(text);
}

/** Copies the link inside the click (Safari keeps the gesture only there) and shows it in the URL. */
function share(): void {
  const doc = currentDocument();
  const url = buildShareUrl(doc);
  const copied = copyText(url);
  // writeDocumentToLocation refuses links too long for the address bar; chat tools tend to
  // truncate those too, so the visitor gets a warning instead of a plain success.
  const fitsAddressBar = writeDocumentToLocation(doc);
  copied.then(
    () =>
      shell.toast(
        fitsAddressBar
          ? { status: "success", text: "Link copied" }
          : {
              status: "warning",
              text: "Link copied. It's very long and may break in some chat apps. Share the JSON file instead if it doesn't open.",
            },
      ),
    (error: unknown) => {
      console.error("[tt-modeler] Could not copy the link:", error);
      history.replaceState(null, "", url);
      shell.toast({
        status: "danger",
        text: "Couldn't copy the link. Copy it from the address bar instead.",
      });
    },
  );
}

function exportJsonFile(): void {
  try {
    exportJson(currentDocument());
    shell.toast({ status: "success", text: "JSON exported" });
  } catch (error) {
    console.error("[tt-modeler] JSON export failed:", error);
    shell.toast({ status: "danger", text: "Couldn't export the JSON file. Try again." });
  }
}

let pngExportRunning = false;

async function exportImage(format: "png" | "svg"): Promise<void> {
  if (format === "svg") {
    try {
      downloadSvg(modeler.saveSVG().svg, diagramTitle());
      shell.toast({ status: "success", text: "SVG exported" });
    } catch (error) {
      console.error("[tt-modeler] SVG export failed:", error);
      shell.toast({
        status: "danger",
        text: "Couldn't export the SVG. Try again, or export as JSON.",
      });
    }
    return;
  }
  if (pngExportRunning) return;
  pngExportRunning = true;
  let progress: ToastHandle | undefined;
  const progressTimer = setTimeout(() => {
    progress = shell.toast({ status: "info", text: "Exporting PNG…", durationMs: 60_000 });
  }, PROGRESS_TOAST_DELAY_MS);
  try {
    await downloadPng(modeler.saveSVG().svg, diagramTitle());
    shell.toast({ status: "success", text: "PNG exported" });
  } catch (error) {
    console.error("[tt-modeler] PNG export failed:", error);
    shell.toast({
      status: "danger",
      text: "Couldn't create the PNG. Try again, or export as SVG.",
    });
  } finally {
    clearTimeout(progressTimer);
    progress?.dismiss();
    pngExportRunning = false;
  }
}

// ---------------------------------------------------------------------------
// The web app's own keys: Cmd/Ctrl+O opens a file, Cmd/Ctrl+S exports JSON, "?" shows the
// shortcuts, and Cmd/Ctrl+Z also works from a chrome control and takes back a replaced diagram
// ---------------------------------------------------------------------------

function isInTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.matches(TEXT_FIELD_SELECTOR) || target.isContentEditable)
  );
}

function modalOpen(): boolean {
  return document.querySelector("dialog:modal") !== null;
}

function inPopup(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role="menu"], [role="dialog"]') !== null;
}

/** The typed letter decides (QWERTZ swaps Z and Y), as in the chrome's isUndoRedoKey. */
function historyLetter(event: KeyboardEvent): string {
  const ascii = event.key.length === 1 && event.key.charCodeAt(0) < 0x80;
  if (ascii) return event.key.toLowerCase();
  return event.code === "KeyZ" ? "z" : event.code === "KeyY" ? "y" : "";
}

/**
 * The canvas keyboard acts only while the canvas or the page has the focus. After a click on a
 * chrome control (zoom, Share, the inspector's buttons) the focus stays there, and undo should
 * still undo; after a replacement the canvas has nothing to undo, so the key takes the diagram back.
 */
function onHistoryKey(event: KeyboardEvent): void {
  if (event.isComposing || !isUndoRedoKey(event) || shell.isEmptyStateShown()) return;
  if (isInTextField(event.target) || inPopup(event.target) || modalOpen()) return;
  const redo = event.shiftKey || historyLetter(event) === "y";
  const target = event.target;
  const onChrome =
    !event.defaultPrevented &&
    target instanceof Node &&
    shell.root.contains(target) &&
    !modeler.container.contains(target);
  if (onChrome) {
    event.preventDefault();
    if (event.repeat) return;
    if (redo) modeler.redo();
    else if (modeler.canUndo()) modeler.undo();
    else replaceUndo?.run();
    return;
  }
  const offer = replaceUndo;
  if (redo || !offer || modeler.canUndo()) return;
  event.preventDefault();
  if (!event.repeat) offer.run();
}

function onFileKey(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
  const key = event.key.toLowerCase();
  if ((key !== "o" && key !== "s") || event.isComposing) return;
  // Never the browser's "Open file" or "Save page as" instead, also not over a dialog.
  event.preventDefault();
  if (event.repeat || modalOpen()) return;
  if (key === "o") {
    pickFile();
    return;
  }
  // The start screen has no diagram yet to save (guide §8: only the card and the legal line).
  if (shell.isEmptyStateShown()) return;
  // A field commits its draft on blur, so the saved file includes what was just typed.
  const active = document.activeElement;
  const field = active instanceof HTMLElement && isInTextField(active) ? active : undefined;
  field?.blur();
  exportJsonFile();
  if (field?.isConnected) field.focus({ preventScroll: true });
}

function onShortcutsKey(event: KeyboardEvent): void {
  if (event.key !== SHORTCUTS_DIALOG_KEY || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.defaultPrevented || event.isComposing || isInTextField(event.target)) return;
  if (inPopup(event.target) || modalOpen()) return;
  event.preventDefault();
  shortcutsDialog.open();
}

function onAppKey(event: KeyboardEvent): void {
  onHistoryKey(event);
  onFileKey(event);
  onShortcutsKey(event);
}

// ---------------------------------------------------------------------------
// Every edit: the start ends, an undo offer goes stale, the copies follow
// ---------------------------------------------------------------------------

modeler.on<{ trigger?: string }>("commandStack.changed", (event) => {
  if (event.trigger !== "clear") {
    shell.setEmptyState(false);
    withdrawReplaceUndo();
    keepStoredDiagram = false;
    if (importWarnings.length > 0) showProblems();
  }
  shell.menu.refresh();
  updateDocumentTitle();
  persistSoon();
});

/** A link pasted into an open tab: the app's own writes use replaceState and fire no hashchange. */
function onHashChange(): void {
  const linked = readDocumentFromLocation();
  if (linked.status === "invalid") {
    console.warn("[tt-modeler] Could not read the shared link:", linked.detail);
    shell.toast({ status: "danger", text: BROKEN_LINK_TEXT });
    return;
  }
  if (linked.status !== "ok" || isSameDocument(linked.document, currentDocument())) return;
  replaceDiagram(linked.document, { announce: true, keepStoredDiagram: true });
}

window.addEventListener("keydown", onAppKey);
window.addEventListener("hashchange", onHashChange);
window.addEventListener("pagehide", flushPersist);
document.addEventListener("visibilitychange", onVisibilityChange);

// ---------------------------------------------------------------------------
// Start: the shared link, else the browser's copy, else the start screen
// ---------------------------------------------------------------------------

function showStartScreen(doc: TtDocument): void {
  modeler.importDocument(doc, { fit: false });
  viewport.afterImport(); // an empty diagram at 100 %
  shownDocument += 1;
  shell.setEmptyState(true);
  updateDocumentTitle();
}

const plan = planStart(readDocumentFromLocation(), loadFromStorage());
if (plan.sharedLinkProblem) {
  console.warn("[tt-modeler] Could not read the shared link:", plan.sharedLinkProblem);
  shell.toast({ status: "danger", text: BROKEN_LINK_TEXT });
}
if (plan.autosaveProblem) {
  console.warn("[tt-modeler] Ignoring a damaged autosave:", plan.autosaveProblem);
  shell.toast({
    status: "warning",
    text: "Your autosaved diagram was damaged and couldn't be restored. Details in the console.",
  });
}
try {
  if (plan.displaced) {
    openDocument(plan.displaced, { announce: false });
    replaceDiagram(plan.document, { announce: true, keepStoredDiagram: true });
  } else if (plan.startScreen) showStartScreen(plan.document);
  else openDocument(plan.document, { announce: plan.announce });
} catch (error) {
  // A diagram the canvas can't display must not lock the app on every load.
  console.error("[tt-modeler] Could not display the diagram:", error);
  shell.toast({
    status: "danger",
    text: "Couldn't display the diagram, so you see an empty one. Details in the console.",
  });
  showStartScreen(emptyDocument());
}

let destroyed = false;

/** For the console and the e2e suite: the app's parts and its teardown, once it started. */
const ttApp: {
  readonly ready: boolean;
  readonly shell: ShellHandle;
  readonly connection: DiagramJsConnection;
  destroy(): void;
} = {
  ready: true,
  shell,
  connection,
  destroy(): void {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener("keydown", onAppKey);
    window.removeEventListener("hashchange", onHashChange);
    window.removeEventListener("pagehide", flushPersist);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    clearTimeout(saveTimer);
    withdrawReplaceUndo();
    fileInput.remove();
    connection.destroy();
    modeler.destroy();
    shell.destroy();
  },
};
// The dev server only: the e2e suite runs against it, and a production page keeps its teardown private.
if (import.meta.env.DEV) {
  Object.assign(globalThis as Record<string, unknown>, { __ttModeler: modeler, __ttApp: ttApp });
}
