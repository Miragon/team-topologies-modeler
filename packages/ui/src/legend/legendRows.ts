/**
 * The legend's content for a host's legend card (the modeler shell's `legend.body`): each shape
 * of the notation with its name and a short explanation, grouped into team types, interaction
 * modes and the other elements. It carries the notation primer the help dialog had before 0.11:
 * what each team type and interaction mode is for, and that solid shapes are long-lived teams while
 * dashed ones are short-lived interactions. Framework-free, because the card is the host's and
 * renders it once.
 */

import {
  ALL_INTERACTION_SPECS,
  ALL_TEAM_SPECS,
  ANNOTATION_SPEC,
  FLOW_SPEC,
  type InteractionMode,
  type TeamType,
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
  /** One short line under the name: what the shape stands for. */
  explanation: string;
}

export interface LegendGroup {
  label: string;
  /** The visible heading: the group and what its shapes share (solid or dashed). */
  heading: string;
  rows: readonly LegendRow[];
}

const TEAM_TYPE_EXPLANATIONS: Readonly<Record<TeamType, string>> = {
  "stream-aligned": "Delivers one stream of work",
  enabling: "Coaches teams in new skills",
  "complicated-subsystem": "Owns a specialist subsystem",
  platform: "Self-service for other teams",
};

const INTERACTION_MODE_EXPLANATIONS: Readonly<Record<InteractionMode, string>> = {
  collaboration: "Teams work closely for a time",
  "x-as-a-service": "One provides, one consumes",
  facilitating: "One team helps another learn",
};

export function legendGroups(): LegendGroup[] {
  return [
    {
      label: "Team types",
      heading: "Teams: solid, long-lived",
      rows: ALL_TEAM_SPECS.map((spec) => ({
        preview: teamIconSvg(spec.type),
        label: spec.label,
        explanation: TEAM_TYPE_EXPLANATIONS[spec.type],
      })),
    },
    {
      label: "Interaction modes",
      heading: "Interactions: dashed, short-lived",
      rows: ALL_INTERACTION_SPECS.map((spec) => ({
        preview: interactionIconSvg(spec.mode),
        label: spec.label,
        explanation: INTERACTION_MODE_EXPLANATIONS[spec.mode],
      })),
    },
    {
      label: "Other elements",
      heading: "Other elements",
      rows: [
        {
          preview: flowIconSvg(),
          label: FLOW_SPEC.label,
          explanation: "Change flows left to right",
        },
        {
          preview: annotationIconSvg(),
          label: ANNOTATION_SPEC.label,
          explanation: "Rationale, questions, plans",
        },
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
    const heading = document.createElement("p");
    heading.className = "tt-legend__heading";
    heading.textContent = group.heading;
    const list = document.createElement("ul");
    list.className = "tt-legend__group";
    list.setAttribute("aria-label", group.label);
    for (const row of group.rows) {
      const item = document.createElement("li");
      item.className = "cd-shell-legend-row tt-legend__row";
      const preview = document.createElement("span");
      preview.className = "cd-shell-legend-preview tt-legend__preview";
      preview.setAttribute("aria-hidden", "true");
      // Static markup the renderer generates from the notation spec.
      preview.innerHTML = row.preview;
      const text = document.createElement("span");
      text.className = "tt-legend__text";
      const label = document.createElement("span");
      label.className = "tt-legend__label";
      label.textContent = row.label;
      const explanation = document.createElement("span");
      explanation.className = "tt-legend__explanation";
      explanation.textContent = row.explanation;
      // The space keeps name and explanation apart in the text a screen reader reads out.
      text.append(label, " ", explanation);
      item.append(preview, text);
      list.append(item);
    }
    body.append(heading, list);
  });
}
