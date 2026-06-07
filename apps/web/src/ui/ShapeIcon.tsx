/** Tiny SVG glyphs for the team types and interaction modes (palette/legend). */

import {
  INTERACTION_MODE_SPECS,
  TEAM_TYPE_SPECS,
  dashArray,
} from "@tt-modeler/model";
import type { InteractionMode, TeamType } from "@tt-modeler/model";

const SIZE = 26;

export function TeamIcon({ type, size = SIZE }: { type: TeamType; size?: number }) {
  const spec = TEAM_TYPE_SPECS[type];
  const common = {
    fill: spec.fill,
    stroke: spec.stroke,
    strokeWidth: 1.5,
    strokeDasharray: dashArray(spec.strokeStyle, 1.5) || undefined,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      {spec.shape === "octagon" ? (
        <polygon
          points="8,3 18,3 23,8 23,18 18,23 8,23 3,18 3,8"
          {...common}
        />
      ) : spec.shape === "rounded-rect-vertical" ? (
        <rect x="8" y="3" width="10" height="20" rx="4" {...common} />
      ) : spec.shape === "rect" ? (
        <rect x="3" y="7" width="20" height="12" rx="1.5" {...common} />
      ) : (
        <rect x="3" y="8" width="20" height="10" rx="5" {...common} />
      )}
    </svg>
  );
}

export function InteractionIcon({
  mode,
  size = SIZE,
}: {
  mode: InteractionMode;
  size?: number;
}) {
  const spec = INTERACTION_MODE_SPECS[mode];
  const common = {
    fill: spec.fill,
    fillOpacity: spec.opacity,
    stroke: spec.stroke,
    strokeWidth: 1.5,
    strokeDasharray: dashArray(spec.strokeStyle, 1.5) || undefined,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden>
      {spec.shape === "circle" ? (
        <circle cx="13" cy="13" r="9" {...common} />
      ) : spec.shape === "triangle" ? (
        <polygon points="5,6 22,13 5,20" {...common} />
      ) : (
        <polygon points="9,6 23,6 17,20 3,20" {...common} />
      )}
    </svg>
  );
}
