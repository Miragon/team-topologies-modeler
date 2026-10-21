/**
 * Shared lifecycle & DI bootstrap for every Team Topologies viewer. Subclasses
 * only override `_getModules()`. The renderer
 * is framework-agnostic — mount it into any element (e.g. a VS Code webview).
 */

import Diagram from "diagram-js/lib/Diagram";
import type { ModuleDeclaration } from "didi";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
import type CommandStack from "diagram-js/lib/command/CommandStack";
import type { Root } from "diagram-js/lib/model/Types";
import type { FreeArea } from "@miragon/modeler-api";
import { documentIdProblems, type TtDocument } from "@miragon/team-topologies-schema-model";
import { saveSVG } from "./io/saveSvg.js";
import type TtImporter from "./io/TtImporter.js";
import type TtExporter from "./io/TtExporter.js";
import type TtViewport from "./io/TtViewport.js";
import { ROOT_ID, type ImportWarning, type RootBusinessObject } from "./io/types.js";
import type TtLabelEditing from "./label-editing/TtLabelEditing.js";
import type { Point } from "./palette/TtPaletteProvider.js";

/**
 * Set on the canvas SVG while it holds focus that arrived by Tab. Mouse users never see a frame
 * around the whole viewport, which a plain `:focus-visible` ring would show after any shortcut.
 */
const CANVAS_KEYBOARD_FOCUS_CLASS = "tt-canvas-keyboard-focus";

export interface TtViewerOptions {
  /** Host element. When absent, a detached <div> is created (attach later). */
  container?: HTMLElement;
  width?: number | string;
  height?: number | string;
  /** Appended to the module list (extension point). */
  additionalModules?: ModuleDeclaration[];
  /**
   * Bind Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Cmd/Ctrl+Y to the canvas history (default true). Pass
   * false when the host owns the history (the VS Code document), so the keys reach it.
   */
  undoRedoKeys?: boolean | undefined;
  /**
   * Where Enter or Space on a creating palette entry places the element (guide §5.5): the centre
   * of the part of the canvas no chrome covers, given as its insets in px from the container's
   * edges (`{ insets }`) or as that centre in diagram coordinates (`{ center }`). Without it, the
   * centre of the visible canvas.
   */
  freeArea?: FreeArea | undefined;
  /**
   * @deprecated Since 0.12, the `@miragon/modeler-api` 1.2 name is `freeArea: { center }`; given
   * both, `freeArea` wins. Accepted for one more minor release.
   */
  freeRectCenter?: (() => Point | undefined) | undefined;
}

export interface ImportOptions {
  /** Fit the diagram into view after the import (default true); hosts with own chrome fit it. */
  fit?: boolean | undefined;
}

export type EventCallback<T = unknown> = (event: T) => void;

type RootWithMeta = Root & { businessObject?: RootBusinessObject };

function sizeToCss(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

export abstract class TtBaseViewer {
  protected abstract _getModules(): ModuleDeclaration[];

  private _diagram: Diagram | undefined;
  private readonly _container: HTMLElement;
  private readonly _options: TtViewerOptions;

  constructor(options: TtViewerOptions = {}) {
    this._options = options;
    this._container = this._createContainer(options);
  }

  private _createContainer(options: TtViewerOptions): HTMLElement {
    const container = options.container ?? document.createElement("div");
    container.classList.add("tt-djs-container");
    container.style.width = sizeToCss(options.width ?? "100%");
    container.style.height = sizeToCss(options.height ?? (options.container ? "100%" : "600px"));
    return container;
  }

  private _ensureDiagram(): Diagram {
    if (!this._diagram) {
      const modules = [...this._getModules(), ...(this._options.additionalModules ?? [])];
      this._diagram = new Diagram({
        canvas: { container: this._container },
        modules,
        ttKeyboard: { undoRedoKeys: this._options.undoRedoKeys ?? true },
        ttPalette: {
          freeArea: this._options.freeArea,
          freeRectCenter: this._options.freeRectCenter,
        },
      });
      this._describeCanvas(this._diagram);
    }
    return this._diagram;
  }

  /**
   * Names the canvas. Its role stays the host's to give: the modeler shell makes it an
   * `application`, so screen readers pass the single-key commands through.
   */
  private _describeCanvas(diagram: Diagram): void {
    const canvasContainer = diagram.get<Canvas>("canvas").getContainer();
    const svg = canvasContainer.querySelector<SVGSVGElement>(":scope > svg");
    if (!svg) return;
    svg.setAttribute("aria-label", "Team Topologies diagram");

    const ownerDocument = canvasContainer.ownerDocument;
    let lastKeyWasTab = false;
    const onKeyDown = (event: KeyboardEvent) => {
      lastKeyWasTab = event.key === "Tab";
    };
    const onPointerDown = () => {
      lastKeyWasTab = false;
      svg.classList.remove(CANVAS_KEYBOARD_FOCUS_CLASS);
    };
    const onFocusIn = () => svg.classList.toggle(CANVAS_KEYBOARD_FOCUS_CLASS, lastKeyWasTab);
    const onFocusOut = () => svg.classList.remove(CANVAS_KEYBOARD_FOCUS_CLASS);
    ownerDocument.addEventListener("keydown", onKeyDown, true);
    ownerDocument.addEventListener("pointerdown", onPointerDown, true);
    svg.addEventListener("focusin", onFocusIn);
    svg.addEventListener("focusout", onFocusOut);
    diagram.get<EventBus>("eventBus").on("diagram.destroy", () => {
      ownerDocument.removeEventListener("keydown", onKeyDown, true);
      ownerDocument.removeEventListener("pointerdown", onPointerDown, true);
    });
  }

  /** Resolve a diagram-js service from the didi injector. */
  get<T>(name: string): T {
    return this._ensureDiagram().get<T>(name);
  }

  on<T = unknown>(event: string, callback: EventCallback<T>, priority = 1000): void {
    this.get<EventBus>("eventBus").on(event, priority, callback as EventCallback);
  }

  off(event: string, callback: EventCallback): void {
    this.get<EventBus>("eventBus").off(event, callback);
  }

  /**
   * Load a document into the canvas (replaces existing content) and, unless `fit: false`, fit it
   * into view. Clears the undo history without a change event: its commands point at the replaced
   * elements and would bring them back, and an import is no edit.
   *
   * Throws, before anything changes, for a document whose ids would collide on the canvas (see
   * `documentIdProblems`), so a rejected document leaves the previous one in place.
   */
  importDocument(doc: TtDocument, options: ImportOptions = {}): { warnings: ImportWarning[] } {
    const problems = documentIdProblems(doc);
    if (problems.length > 0) {
      throw new Error(
        problems.map(({ path, message }) => `${path.join(".")}: ${message}`).join("; "),
      );
    }
    const diagram = this._ensureDiagram();
    const eventBus = diagram.get<EventBus>("eventBus");
    const importer = diagram.get<TtImporter>("ttImporter");
    const labelEditing = diagram.get<TtLabelEditing>("ttLabelEditing", false);
    eventBus.fire("import.parse.start", { document: doc });
    labelEditing?.suspend();
    diagram.get<CommandStack>("commandStack", false)?.clear(false);
    importer.clear();
    const warnings = importer.import(doc);
    if (options.fit !== false) this._fit();
    eventBus.fire("import.done", { warnings });
    labelEditing?.resumeAfterImport();
    return { warnings };
  }

  /**
   * Fit the whole diagram into the viewport, keeping the strip under the floating palette free
   * (88px at the top, 120px when the container is 760px wide or narrower).
   *
   * @deprecated Host chrome fits the diagram (the modeler shell's viewport, with the insets of the
   * chrome that is open); kept for hosts without it.
   */
  fitToView(): void {
    this._fit();
  }

  private _fit(): void {
    const viewport = this._ensureDiagram().get<TtViewport>("ttViewport", false);
    if (viewport) viewport.fit();
    else this.get<Canvas>("canvas").zoom("fit-viewport");
  }

  /** Current canvas state as a canonical document. */
  exportDocument(): TtDocument {
    return this.get<TtExporter>("ttExporter").export();
  }

  /**
   * Update diagram-level metadata (the title) on the root, outside the undo history.
   *
   * @deprecated Rename through `ttModeling.setTitle(title)`: one undo step that hosts see as a
   * change like any other.
   */
  setMeta(partial: Partial<RootBusinessObject>): void {
    const canvas = this.get<Canvas>("canvas");
    let root: RootWithMeta | undefined;
    try {
      root = canvas.getRootElement() as RootWithMeta;
    } catch {
      return;
    }
    if (!root || root.id !== ROOT_ID) return;
    const current = root.businessObject ?? { title: "Untitled team topology" };
    root.businessObject = { ...current, ...partial };
  }

  /** Read diagram-level metadata (the title) from the root. */
  getMeta(): RootBusinessObject | undefined {
    try {
      const root = this.get<Canvas>("canvas").getRootElement() as RootWithMeta;
      return root.businessObject;
    } catch {
      return undefined;
    }
  }

  /** Standalone, self-contained SVG snapshot. */
  saveSVG(): { svg: string } {
    return saveSVG(this.get<Canvas>("canvas"), this.get<ElementRegistry>("elementRegistry"));
  }

  /** Attach the container into `target`. */
  attachTo(target: Element): void {
    target.appendChild(this._container);
    this.get<Canvas>("canvas").resized();
  }

  /** Detach the container from the DOM, preserving state. */
  detach(): void {
    this._container.remove();
  }

  clear(): void {
    this._ensureDiagram().clear();
  }

  destroy(): void {
    if (this._diagram) {
      this._diagram.destroy();
      this._diagram = undefined;
    }
    this._container.remove();
  }

  get container(): HTMLElement {
    return this._container;
  }
}
