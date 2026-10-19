/**
 * The tool palette: the lasso (multi-select) tool, then drag-to-create entries for the four team
 * types, the three interaction-mode glyphs (placed over team boundaries), the flow-of-change arrow
 * and the text annotation.
 *
 * A host's chrome (the modeler shell) lays the palette out, gives it its toolbar semantics and
 * triggers an entry from the keyboard with a click whose `detail` is 0. Such a click on a creating
 * entry places the element in the centre of the free part of the canvas (guide §5.5), 24px further
 * diagonally while that spot is taken, selects it and opens its label editor: diagram-js's create
 * tool follows the pointer and never ends without one.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type Palette from "diagram-js/lib/features/palette/Palette";
import type Create from "diagram-js/lib/features/create/Create";
import type LassoTool from "diagram-js/lib/features/lasso-tool/LassoTool";
import type Modeling from "diagram-js/lib/features/modeling/Modeling";
import type Selection from "diagram-js/lib/features/selection/Selection";
import type {
  PaletteEntries,
  PaletteEntry,
  default as PaletteProvider,
} from "diagram-js/lib/features/palette/PaletteProvider";
import type { Root, Shape } from "diagram-js/lib/model/Types";
import type { Injector } from "didi";
import {
  ALL_INTERACTION_SPECS,
  ALL_TEAM_SPECS,
  ANNOTATION_SPEC,
  FLOW_SPEC,
} from "@miragon/team-topologies-schema-model";
import {
  annotationIconSvg,
  flowIconSvg,
  interactionIconSvg,
  lassoIconSvg,
  teamIconSvg,
} from "../draw/palette-icons.js";
import type { TtLabelEditing } from "../label-editing/index.js";
import { isTtElement, type TtElement } from "../model/di-types.js";
import type TtElementFactory from "../model/TtElementFactory.js";
import type { TtReadOnly } from "../read-only/index.js";

/** diagram-js highlights the active tool only inside a group named exactly `tools`. */
const GROUP_TOOLS = "tools";
const GROUP_TEAMS = "tt-1-teams";
const GROUP_MODES = "tt-2-modes";
const GROUP_GUIDES = "tt-3-guides";

/** Guide §5.5: a keyboard-created element lands this far down-right of one already centred there. */
const KEYBOARD_CREATE_OFFSET = 24;

export interface Point {
  x: number;
  y: number;
}

export interface TtPaletteConfig {
  /**
   * The centre of the part of the canvas no chrome covers, in diagram coordinates (the modeler
   * shell's `viewport.freeRectCenter()`). Without it, the centre of the visible canvas.
   */
  freeRectCenter?: (() => Point | undefined) | undefined;
}

function entryHtml(icon: string, draggable = true): string {
  return `<div class="entry tt-palette-entry" draggable="${draggable}">${icon}</div>`;
}

/** A click the chrome synthesises for Enter or Space on a palette entry (no pointer, detail 0). */
function isKeyboardClick(event: Event): boolean {
  return event.type === "click" && (event as MouseEvent).detail === 0;
}

function centreOf(element: TtElement): Point {
  return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
}

export default class TtPaletteProvider implements PaletteProvider {
  static $inject = [
    "config.ttPalette",
    "palette",
    "create",
    "ttElementFactory",
    "lassoTool",
    "canvas",
    "modeling",
    "selection",
    "elementRegistry",
    "injector",
  ];

  private readonly readOnly: TtReadOnly | undefined;
  private readonly labelEditing: TtLabelEditing | undefined;

  constructor(
    private readonly config: TtPaletteConfig | undefined,
    palette: Palette,
    private readonly create: Create,
    private readonly factory: TtElementFactory,
    private readonly lassoTool: LassoTool,
    private readonly canvas: Canvas,
    private readonly modeling: Modeling,
    private readonly selection: Selection,
    private readonly elementRegistry: ElementRegistry,
    injector: Injector,
  ) {
    this.readOnly = injector.get<TtReadOnly>("ttReadOnly", false);
    this.labelEditing = injector.get<TtLabelEditing>("ttLabelEditing", false);
    palette.registerProvider(this);
  }

  getPaletteEntries(): PaletteEntries {
    const entries: PaletteEntries = {};

    entries["lasso-tool"] = {
      group: GROUP_TOOLS,
      title: "Select several elements",
      html: entryHtml(lassoIconSvg(), false),
      action: {
        click: (event: Event) => this.lassoTool.activateSelection(event as MouseEvent),
      },
    };

    for (const spec of ALL_TEAM_SPECS) {
      entries[`team.${spec.type}`] = this.createEntry(
        GROUP_TEAMS,
        `${spec.label} team`,
        teamIconSvg(spec.type),
        () => this.factory.createNewTeam(spec.type, spec.label) as unknown as Shape,
      );
    }

    for (const spec of ALL_INTERACTION_SPECS) {
      entries[`mode.${spec.mode}`] = this.createEntry(
        GROUP_MODES,
        `${spec.label} interaction`,
        interactionIconSvg(spec.mode),
        () => this.factory.createNewInteraction(spec.mode) as unknown as Shape,
      );
    }

    entries["flow"] = this.createEntry(
      GROUP_GUIDES,
      FLOW_SPEC.label,
      flowIconSvg(),
      () => this.factory.createNewFlow() as unknown as Shape,
    );

    entries["annotation"] = this.createEntry(
      GROUP_GUIDES,
      ANNOTATION_SPEC.label,
      annotationIconSvg(),
      () => this.factory.createNewAnnotation() as unknown as Shape,
    );

    return entries;
  }

  private createEntry(
    group: string,
    title: string,
    icon: string,
    newShape: () => Shape,
  ): PaletteEntry {
    const start = (event: Event) => {
      if (isKeyboardClick(event)) this.placeInFreeRect(newShape());
      else this.create.start(event as MouseEvent, newShape());
    };
    return {
      group,
      title,
      html: entryHtml(icon),
      action: { dragstart: start, click: start },
    };
  }

  /** The centre of the free rectangle, stepped diagonally past elements already centred there. */
  private freePlace(): Point {
    const viewbox = this.canvas.viewbox();
    const centre = this.config?.freeRectCenter?.() ?? {
      x: viewbox.x + viewbox.width / 2,
      y: viewbox.y + viewbox.height / 2,
    };
    const place = { x: Math.round(centre.x), y: Math.round(centre.y) };
    const taken = () =>
      this.elementRegistry.filter(isTtElement).some((element) => {
        const elementCentre = centreOf(element as unknown as TtElement);
        return Math.abs(elementCentre.x - place.x) < 1 && Math.abs(elementCentre.y - place.y) < 1;
      });
    while (taken()) {
      place.x += KEYBOARD_CREATE_OFFSET;
      place.y += KEYBOARD_CREATE_OFFSET;
    }
    return place;
  }

  private placeInFreeRect(shape: Shape): void {
    if (this.readOnly?.isReadOnly()) return;
    const created = this.modeling.createShape(
      shape,
      this.freePlace(),
      this.canvas.getRootElement() as Root,
    );
    this.selection.select(created);
    this.canvas.focus();
    if (isTtElement(created)) this.labelEditing?.activate(created);
  }
}
