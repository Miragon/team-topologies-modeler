/** Collapsible legend mapping each shape to its team type, interaction mode or element kind. */

import { X } from "lucide-react";
import {
  ALL_INTERACTION_SPECS,
  ALL_TEAM_SPECS,
  ANNOTATION_SPEC,
  FLOW_SPEC,
} from "@miragon/team-topologies-schema-model";
import { Icon } from "../Icon";
import { AnnotationIcon, FlowIcon, InteractionIcon, TeamIcon } from "../ShapeIcon";

const LEGEND_ICON_SIZE = 20;

export interface LegendProps {
  /** The host owns the state, so its own control (a menu entry) can switch the legend on and off. */
  open: boolean;
  /** The legend's close button was used. */
  onClose: () => void;
  /**
   * Called right after `onClose`. The legend closes by unmounting, so the host moves keyboard focus
   * to the control that reopens it.
   */
  onRequestFocusReturn?: () => void;
}

export function Legend({ open, onClose, onRequestFocusReturn }: LegendProps) {
  if (!open) return null;

  const hideLegend = () => {
    onClose();
    onRequestFocusReturn?.();
  };

  return (
    <section className="tt-legend" aria-labelledby="tt-legend-title">
      <div className="tt-legend__head">
        <h2 id="tt-legend-title" className="tt-legend__title">
          Legend
        </h2>
        <button
          type="button"
          className="tt-closebtn tt-closebtn--sm"
          onClick={hideLegend}
          aria-label="Hide legend"
          title="Hide legend"
        >
          <Icon icon={X} />
        </button>
      </div>
      <ul className="tt-legend__group" aria-label="Team types">
        {ALL_TEAM_SPECS.map((spec) => (
          <li className="tt-legend__row" key={spec.type}>
            <TeamIcon type={spec.type} size={LEGEND_ICON_SIZE} />
            <span>{spec.label}</span>
          </li>
        ))}
      </ul>
      <ul className="tt-legend__group" aria-label="Interaction modes">
        {ALL_INTERACTION_SPECS.map((spec) => (
          <li className="tt-legend__row" key={spec.mode}>
            <InteractionIcon mode={spec.mode} size={LEGEND_ICON_SIZE} />
            <span>{spec.label}</span>
          </li>
        ))}
      </ul>
      <ul className="tt-legend__group" aria-label="Other elements">
        <li className="tt-legend__row">
          <FlowIcon size={LEGEND_ICON_SIZE} />
          <span>{FLOW_SPEC.label}</span>
        </li>
        <li className="tt-legend__row">
          <AnnotationIcon size={LEGEND_ICON_SIZE} />
          <span>{ANNOTATION_SPEC.label}</span>
        </li>
      </ul>
    </section>
  );
}
