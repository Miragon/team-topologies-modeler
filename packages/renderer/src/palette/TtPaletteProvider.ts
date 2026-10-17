/**
 * The floating tool palette (styled top-centre, Excalidraw style). It starts
 * with the lasso (multi-select) tool; every other entry is drag-to-create: the
 * four team types, the three interaction-mode glyphs (placed over team
 * boundaries), the flow-of-change arrow and the text annotation.
 *
 * Every entry is a focusable button. Enter or Space on a create entry places the
 * element at the centre of the viewport and selects it, so the palette works
 * without a pointer.
 */

import type Canvas from "diagram-js/lib/core/Canvas";
import type ElementRegistry from "diagram-js/lib/core/ElementRegistry";
import type EventBus from "diagram-js/lib/core/EventBus";
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
import type TtElementFactory from "../model/TtElementFactory.js";

/** diagram-js highlights the active tool only inside a group named exactly `tools`. */
const GROUP_TOOLS = "tools";
const GROUP_TEAMS = "tt-1-teams";
const GROUP_MODES = "tt-2-modes";
const GROUP_GUIDES = "tt-3-guides";

const ENTRY_SELECTOR = ".entry[data-action]";

function entryHtml(icon: string, draggable = true): string {
  return `<div class="entry tt-palette-entry" draggable="${draggable}" tabindex="0">${icon}</div>`;
}

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

export default class TtPaletteProvider implements PaletteProvider {
  static $inject = [
    "palette",
    "create",
    "ttElementFactory",
    "lassoTool",
    "eventBus",
    "canvas",
    "modeling",
    "selection",
    "elementRegistry",
  ];

  constructor(
    private readonly palette: Palette,
    private readonly create: Create,
    private readonly factory: TtElementFactory,
    private readonly lassoTool: LassoTool,
    eventBus: EventBus,
    private readonly canvas: Canvas,
    private readonly modeling: Modeling,
    private readonly selection: Selection,
    private readonly elementRegistry: ElementRegistry,
  ) {
    palette.registerProvider(this);
    eventBus.on("palette.create", (event: { container: HTMLElement }) =>
      event.container.addEventListener("keydown", (keyboardEvent) =>
        this.onEntryKeyDown(keyboardEvent),
      ),
    );
  }

  getPaletteEntries(): PaletteEntries {
    const entries: PaletteEntries = {};

    entries["lasso-tool"] = {
      group: GROUP_TOOLS,
      title: "Select several elements",
      shortcut: "Shift + drag",
      html: entryHtml(lassoIconSvg(), false),
      action: {
        click: (event: Event) => this.lassoTool.activateSelection(event as MouseEvent),
        keyboard: () => this.selectAll(),
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
    const start = (event: Event) => this.create.start(event as MouseEvent, newShape());
    return {
      group,
      title,
      html: entryHtml(icon),
      action: {
        dragstart: start,
        click: start,
        keyboard: () => this.createAtViewportCentre(newShape()),
      },
    };
  }

  private onEntryKeyDown(event: KeyboardEvent): void {
    if (!isActivationKey(event) || event.repeat) return;
    const entry = (event.target as HTMLElement | null)?.closest?.(ENTRY_SELECTOR);
    const action = entry?.getAttribute("data-action");
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    this.palette.triggerEntry(action, "keyboard", event);
  }

  private createAtViewportCentre(shape: Shape): void {
    const viewbox = this.canvas.viewbox();
    const centre = {
      x: Math.round(viewbox.x + viewbox.width / 2),
      y: Math.round(viewbox.y + viewbox.height / 2),
    };
    const created = this.modeling.createShape(shape, centre, this.canvas.getRootElement() as Root);
    this.selection.select(created);
    this.canvas.focus();
  }

  private selectAll(): void {
    this.selection.select(this.elementRegistry.filter((element) => Boolean(element.parent)));
    this.canvas.focus();
  }
}
