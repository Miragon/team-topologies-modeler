/**
 * The floating tool palette (styled top-centre, Excalidraw style). It starts
 * with the lasso (multi-select) tool; every other entry is drag-to-create: the
 * four team types, the three interaction-mode glyphs (placed over team
 * boundaries), the flow-of-change arrow and the text annotation.
 */

import type Palette from "diagram-js/lib/features/palette/Palette";
import type Create from "diagram-js/lib/features/create/Create";
import type LassoTool from "diagram-js/lib/features/lasso-tool/LassoTool";
import type {
  PaletteEntries,
  default as PaletteProvider,
} from "diagram-js/lib/features/palette/PaletteProvider";
import type { Element } from "diagram-js/lib/model/Types";
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

function entryHtml(icon: string, title: string, draggable = true): string {
  return `<div class="entry tt-palette-entry" draggable="${draggable}" title="${title}">${icon}</div>`;
}

export default class TtPaletteProvider implements PaletteProvider {
  static $inject = ["palette", "create", "ttElementFactory", "lassoTool"];

  constructor(
    palette: Palette,
    private readonly create: Create,
    private readonly factory: TtElementFactory,
    private readonly lassoTool: LassoTool,
  ) {
    palette.registerProvider(this);
  }

  getPaletteEntries(): PaletteEntries {
    const entries: PaletteEntries = {};

    const lassoTitle = "Select several elements (or Shift + drag on the canvas)";
    entries["lasso-tool"] = {
      group: GROUP_TOOLS,
      title: lassoTitle,
      html: entryHtml(lassoIconSvg(), lassoTitle, false),
      action: { click: (event: Event) => this.lassoTool.activateSelection(event as MouseEvent) },
    };

    for (const spec of ALL_TEAM_SPECS) {
      const start = (event: Event) =>
        this.create.start(
          event as MouseEvent,
          this.factory.createNewTeam(spec.type, spec.label) as unknown as Element,
        );
      entries[`team.${spec.type}`] = {
        group: GROUP_TEAMS,
        title: `${spec.label} team — ${spec.description}`,
        html: entryHtml(teamIconSvg(spec.type), `${spec.label} team — ${spec.description}`),
        action: { dragstart: start, click: start },
      };
    }

    for (const spec of ALL_INTERACTION_SPECS) {
      const start = (event: Event) =>
        this.create.start(
          event as MouseEvent,
          this.factory.createNewInteraction(spec.mode) as unknown as Element,
        );
      entries[`mode.${spec.mode}`] = {
        group: GROUP_MODES,
        title: `${spec.label} — ${spec.description} (place over the teams it relates to)`,
        html: entryHtml(interactionIconSvg(spec.mode), `${spec.label} — ${spec.description}`),
        action: { dragstart: start, click: start },
      };
    }

    const startFlow = (event: Event) =>
      this.create.start(event as MouseEvent, this.factory.createNewFlow() as unknown as Element);
    entries["flow"] = {
      group: GROUP_GUIDES,
      title: `${FLOW_SPEC.label} — the implied left-to-right flow`,
      html: entryHtml(flowIconSvg(), FLOW_SPEC.label),
      action: { dragstart: startFlow, click: startFlow },
    };

    const startAnnotation = (event: Event) =>
      this.create.start(
        event as MouseEvent,
        this.factory.createNewAnnotation() as unknown as Element,
      );
    const annotationTitle = `${ANNOTATION_SPEC.label} — a free-text note beside the diagram`;
    entries["annotation"] = {
      group: GROUP_GUIDES,
      title: annotationTitle,
      html: entryHtml(annotationIconSvg(), annotationTitle),
      action: { dragstart: startAnnotation, click: startAnnotation },
    };

    return entries;
  }
}
