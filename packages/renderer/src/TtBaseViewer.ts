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
import type { TtDocument } from "@miragon/team-topologies-schema-model";
import { saveSVG } from "./io/saveSvg.js";
import type TtImporter from "./io/TtImporter.js";
import type TtExporter from "./io/TtExporter.js";
import type TtViewport from "./io/TtViewport.js";
import { ROOT_ID, type ImportWarning, type RootBusinessObject } from "./io/types.js";

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
      this._diagram = new Diagram({ canvas: { container: this._container }, modules });
      this._describeCanvas(this._diagram);
    }
    return this._diagram;
  }

  private _describeCanvas(diagram: Diagram): void {
    const canvasContainer = diagram.get<Canvas>("canvas").getContainer();
    const svg = canvasContainer.querySelector<SVGSVGElement>(":scope > svg");
    if (!svg) return;
    svg.setAttribute("role", "group");
    svg.setAttribute("aria-roledescription", "canvas");
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
   * Load a document into the canvas (replaces existing content) and fit it into view. Clears the
   * undo history: its commands point at the replaced elements and would bring them back.
   */
  importDocument(doc: TtDocument): { warnings: ImportWarning[] } {
    const diagram = this._ensureDiagram();
    const eventBus = diagram.get<EventBus>("eventBus");
    const importer = diagram.get<TtImporter>("ttImporter");
    diagram.get<CommandStack>("commandStack", false)?.clear();
    importer.clear();
    const warnings = importer.import(doc);
    this.fitToView();
    eventBus.fire("import.done", { warnings });
    return { warnings };
  }

  /**
   * Fit the whole diagram into the viewport, keeping the strip under the floating palette free
   * (88px at the top, 120px when the container is 760px wide or narrower).
   */
  fitToView(): void {
    const viewport = this._ensureDiagram().get<TtViewport>("ttViewport", false);
    if (viewport) viewport.fit();
    else this.get<Canvas>("canvas").zoom("fit-viewport");
  }

  /** Current canvas state as a canonical document. */
  exportDocument(): TtDocument {
    return this.get<TtExporter>("ttExporter").export();
  }

  /** Update diagram-level metadata (title / flow-of-change) on the root. */
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

  /** Read diagram-level metadata (title / flow-of-change) from the root. */
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
  attachTo(target: HTMLElement): void {
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
