/**
 * The legend's content for a host's legend card (the modeler shell's `legend.body`): each shape
 * of the notation with its name, grouped into team types, interaction modes and the other
 * elements. Framework-free, because the card is the host's and renders it once.
 */

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
  teamIconSvg,
} from "@miragon/team-topologies-renderer";

export interface LegendRow {
  /** The palette's glyph as SVG markup, so legend and palette always show the same shape. */
  preview: string;
  label: string;
}

export interface LegendGroup {
  label: string;
  rows: readonly LegendRow[];
}

export function legendGroups(): LegendGroup[] {
  return [
    {
      label: "Team types",
      rows: ALL_TEAM_SPECS.map((spec) => ({ preview: teamIconSvg(spec.type), label: spec.label })),
    },
    {
      label: "Interaction modes",
      rows: ALL_INTERACTION_SPECS.map((spec) => ({
        preview: interactionIconSvg(spec.mode),
        label: spec.label,
      })),
    },
    {
      label: "Other elements",
      rows: [
        { preview: flowIconSvg(), label: FLOW_SPEC.label },
        { preview: annotationIconSvg(), label: ANNOTATION_SPEC.label },
      ],
    },
  ];
}

/** Renders the legend rows into `body`, with the shell's row, preview and separator classes. */
export function renderLegendRows(body: HTMLElement): void {
  const document = body.ownerDocument;
  legendGroups().forEach((group, index) => {
    if (index > 0) {
      const separator = document.createElement("hr");
      separator.className = "cd-shell-legend-separator";
      body.append(separator);
    }
    const list = document.createElement("ul");
    list.className = "tt-legend__group";
    list.setAttribute("aria-label", group.label);
    for (const row of group.rows) {
      const item = document.createElement("li");
      item.className = "cd-shell-legend-row";
      const preview = document.createElement("span");
      preview.className = "cd-shell-legend-preview tt-legend__preview";
      preview.setAttribute("aria-hidden", "true");
      // Static markup the renderer generates from the notation spec.
      preview.innerHTML = row.preview;
      const label = document.createElement("span");
      label.textContent = row.label;
      item.append(preview, label);
      list.append(item);
    }
    body.append(list);
  });
}
