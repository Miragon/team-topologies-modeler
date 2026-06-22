/** Collapsible legend mapping each shape to its team type / interaction mode. */

import { ALL_INTERACTION_SPECS, ALL_TEAM_SPECS } from "@miragon/team-topologies-schema-model";
import { InteractionIcon, TeamIcon } from "./ShapeIcon";
import { useUiStore } from "./uiStore";

export function Legend() {
  const open = useUiStore((s) => s.legendOpen);
  const toggle = useUiStore((s) => s.toggleLegend);
  if (!open) return null;

  return (
    <div className="tt-legend" aria-label="Legend">
      <div className="tt-legend__head">
        <strong>Legend</strong>
        <button
          type="button"
          className="tt-legend__close"
          onClick={toggle}
          aria-label="Hide legend"
        >
          ×
        </button>
      </div>
      <div className="tt-legend__group">
        {ALL_TEAM_SPECS.map((s) => (
          <div className="tt-legend__row" key={s.type}>
            <TeamIcon type={s.type} size={20} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="tt-legend__divider" />
      <div className="tt-legend__group">
        {ALL_INTERACTION_SPECS.map((s) => (
          <div className="tt-legend__row" key={s.mode}>
            <InteractionIcon mode={s.mode} size={20} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
