/**
 * The floating tool palette (styled top-centre, Excalidraw style). Every entry
 * is drag-to-create: the four team types, the three interaction-mode glyphs
 * (placed over team boundaries), and the flow-of-change arrow.
 */

import type Palette from "diagram-js/lib/features/palette/Palette";
import type Create from "diagram-js/lib/features/create/Create";
import type {
  PaletteEntries,
  default as PaletteProvider,
} from "diagram-js/lib/features/palette/PaletteProvider";
import type { Element } from "diagram-js/lib/model/Types";
import { ALL_INTERACTION_SPECS, ALL_TEAM_SPECS, FLOW_SPEC } from "@tt-modeler/model";
import {
  flowIconSvg,
  interactionIconSvg,
  teamIconSvg,
} from "../draw/palette-icons.js";
import type TtElementFactory from "../model/TtElementFactory.js";

const GROUP_TEAMS = "tt-1-teams";
const GROUP_MODES = "tt-2-modes";
const GROUP_FLOW = "tt-3-flow";

function entryHtml(icon: string, title: string): string {
  return `<div class="entry tt-palette-entry" draggable="true" title="${title}">${icon}</div>`;
}

export default class TtPaletteProvider implements PaletteProvider {
  static $inject = ["palette", "create", "ttElementFactory"];

  constructor(
    palette: Palette,
    private readonly create: Create,
    private readonly factory: TtElementFactory,
  ) {
    palette.registerProvider(this);
  }

  getPaletteEntries(): PaletteEntries {
    const entries: PaletteEntries = {};

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
      group: GROUP_FLOW,
      title: `${FLOW_SPEC.label} — the implied left-to-right flow`,
      html: entryHtml(flowIconSvg(), FLOW_SPEC.label),
      action: { dragstart: startFlow, click: startFlow },
    };

    return entries;
  }
}
