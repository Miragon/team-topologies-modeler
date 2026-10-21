/**
 * The Team Topologies modeler behind the collaborative-modeler contract of `@miragon/modeler-api`
 * (the laws L1 to L7 in its README): hosts such as designIQ, the VS Code webview and the web app
 * import and export the document as text, observe changes and anchor on element ids without
 * knowing the renderer.
 */

import {
  MODELER_API_VERSION,
  type CollaborativeModeler,
  type CollaborativeModelerOptions,
  type ElementBounds,
  type ElementInfo,
  type ElementsSurface,
  type ImportResult,
  type ModelerMeta,
} from "@miragon/modeler-api";
import {
  parseDocument,
  serializeDocument,
  type TtDocument,
} from "@miragon/team-topologies-schema-model";
import type { ModuleDeclaration } from "didi";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import type Selection from "diagram-js/lib/features/selection/Selection";
import { Modeler } from "../Modeler.js";
import { NavigatedViewer } from "../NavigatedViewer.js";
import { isTtElement, type TtElement } from "../model/di-types.js";
import type { Point } from "../palette/TtPaletteProvider.js";

/** Stable notation id in `meta.notation` of the collaborative-modeler contract. */
export const TEAM_TOPOLOGIES_NOTATION = "team-topologies";

/**
 * The contract's factory options (`freeArea`, `fitOnImport`, `undoRedoKeys`; the viewer ignores
 * `freeArea` and `undoRedoKeys`) plus the renderer's own.
 */
export interface CollaborativeTeamTopologiesOptions extends CollaborativeModelerOptions {
  /** Appended to the renderer's own modules (e.g. a host's chrome module). */
  additionalModules?: ModuleDeclaration[] | undefined;
  /**
   * @deprecated Since 0.12, the contract's name is `freeArea: { center }`; given both, `freeArea`
   * wins. Accepted for one more minor release.
   */
  freeRectCenter?: (() => Point | undefined) | undefined;
}

/** The elements surface with the optional `bounds` of contract 1.2, which this renderer has. */
export interface TtElementsSurface extends ElementsSurface {
  bounds(id: string): ElementBounds | undefined;
}

/** The contract surface plus the wrapped diagram for host-specific wiring. */
export interface CollaborativeTeamTopologiesModeler extends CollaborativeModeler {
  readonly elements: TtElementsSurface;
  readonly diagram: Modeler | NavigatedViewer;
}

interface ViewState {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The editing mount (`meta.editable: true`) of the collaborative-modeler contract. */
export function createCollaborativeModeler(
  options: CollaborativeTeamTopologiesOptions = {},
): CollaborativeTeamTopologiesModeler {
  return collaborative(
    new Modeler({
      ...diagramOptions(options),
      undoRedoKeys: options.undoRedoKeys ?? true,
      freeArea: options.freeArea,
      freeRectCenter: options.freeRectCenter,
    }),
    true,
    options.fitOnImport ?? true,
  );
}

/** The read-only mount (`meta.editable: false`): imports, exports and reveals, never edits. */
export function createCollaborativeViewer(
  options: CollaborativeTeamTopologiesOptions = {},
): CollaborativeTeamTopologiesModeler {
  return collaborative(
    new NavigatedViewer(diagramOptions(options)),
    false,
    options.fitOnImport ?? true,
  );
}

function diagramOptions(options: Pick<CollaborativeTeamTopologiesOptions, "additionalModules">) {
  return { width: "100%", height: "100%", additionalModules: options.additionalModules ?? [] };
}

/**
 * The document text as the contract reads it: blank text is a new, empty diagram (a file just
 * created in an editor), anything else must be a valid document.
 */
export function parseDocumentText(text: string): TtDocument {
  const result = parseDocument(text.trim() === "" ? {} : JSON.parse(text));
  if (!result.ok) throw new Error(result.error);
  return result.document;
}

function collaborative(
  diagram: Modeler | NavigatedViewer,
  editable: boolean,
  fitOnImport: boolean,
): CollaborativeTeamTopologiesModeler {
  const eventBus = diagram.get<EventBus>("eventBus");
  const canvas = diagram.get<Canvas>("canvas");
  const elementRegistry = diagram.get<ElementRegistry>("elementRegistry");
  const selection = diagram.get<Selection>("selection");
  const contentListeners = new Set<() => void>();
  let importsRunning = 0;
  let destroyed = false;
  let lastExport = "";

  const meta: ModelerMeta = {
    notation: TEAM_TOPOLOGIES_NOTATION,
    apiVersion: MODELER_API_VERSION,
    editable,
  };

  if (editable) {
    eventBus.on("commandStack.changed", () => {
      if (importsRunning > 0) return;
      for (const listener of [...contentListeners]) listener();
    });
  }

  const exportText = (): string => serializeDocument(diagram.exportDocument());

  const elements: TtElementsSurface = {
    list: () =>
      destroyed ? [] : (elementRegistry.getAll() as unknown[]).filter(isTtElement).map(elementInfo),
    reveal(id) {
      if (destroyed) return false;
      const element = elementRegistry.get(id);
      if (!isTtElement(element)) return false;
      selection.select(element);
      canvas.scrollToElement(element);
      return true;
    },
    selection: () => (destroyed ? [] : elementIds(selection.get())),
    onSelection(callback) {
      const listener = (event: unknown) =>
        callback(elementIds((event as { newSelection?: unknown[] }).newSelection ?? []));
      eventBus.on("selection.changed", listener);
      return () => eventBus.off("selection.changed", listener);
    },
    bounds(id) {
      if (destroyed) return undefined;
      const element = elementRegistry.get(id);
      if (!isTtElement(element)) return undefined;
      const { x, y, width, height } = element;
      return { x, y, width, height };
    },
  };

  return {
    meta,
    elements,
    diagram,
    attachTo(host) {
      diagram.attachTo(host);
    },
    async importText(text): Promise<ImportResult> {
      if (destroyed) throw new Error("The modeler was destroyed.");
      const document = parseDocumentText(text);
      importsRunning += 1;
      try {
        const { warnings } = diagram.importDocument(document, { fit: fitOnImport });
        return { warnings: warnings.map((warning) => warning.message) };
      } finally {
        importsRunning -= 1;
      }
    },
    exportText() {
      // Asking a destroyed diagram would build a new one on the detached container.
      if (destroyed) return lastExport;
      return exportText();
    },
    onContentChanged(callback) {
      if (!editable) return () => undefined;
      contentListeners.add(callback);
      return () => contentListeners.delete(callback);
    },
    getViewState(): ViewState | undefined {
      if (destroyed) return undefined;
      try {
        const { x, y, width, height } = canvas.viewbox();
        const state = { x, y, width, height };
        return isViewState(state) ? state : undefined;
      } catch {
        return undefined;
      }
    },
    setViewState(state) {
      if (destroyed || !isViewState(state)) return;
      canvas.viewbox({ x: state.x, y: state.y, width: state.width, height: state.height });
    },
    destroy() {
      if (destroyed) return;
      try {
        lastExport = exportText();
      } catch {
        lastExport = "";
      }
      destroyed = true;
      contentListeners.clear();
      diagram.destroy();
    },
  };
}

/** Connectors are not addressable: their ids derive from the annotation and are never stored. */
function elementIds(elements: readonly unknown[]): string[] {
  return elements.filter(isTtElement).map((element) => element.id);
}

/** A team's, interaction's or flow's label; an annotation's text. */
function elementInfo(element: TtElement): ElementInfo {
  const name = element.ttLabel;
  return name ? { id: element.id, name } : { id: element.id };
}

function isViewState(state: unknown): state is ViewState {
  if (typeof state !== "object" || state === null) return false;
  const { x, y, width, height } = state as Record<string, unknown>;
  return (
    isFiniteNumber(x) &&
    isFiniteNumber(y) &&
    isFiniteNumber(width) &&
    isFiniteNumber(height) &&
    width > 0 &&
    height > 0
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
