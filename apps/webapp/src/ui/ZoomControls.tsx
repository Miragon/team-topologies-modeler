/**
 * Bottom-right zoom control (guide §5): zoom out, the current zoom level (click for 100 %), zoom
 * in, and fit the diagram to the window. The steps are diagram-js's own wheel steps, so the
 * buttons, the + / - keys and the mouse wheel all land on the same levels and limits.
 */

import { useEffect, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ZoomScroll from "diagram-js/lib/navigation/zoomscroll/ZoomScroll";
import { Icon } from "@miragon/team-topologies-ui";
import { useModeler } from "@/state/modelerContext";

/** diagram-js ZoomScroll clamps every step to this range. */
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const LIMIT_TOLERANCE = 0.001;

function readZoom(canvas: Canvas): number {
  const zoom = canvas.zoom();
  return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

export function ZoomControls() {
  const { modeler } = useModeler();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = modeler.get<Canvas>("canvas");
    const sync = (event: unknown) => {
      const scale = (event as { viewbox?: { scale?: number } } | undefined)?.viewbox?.scale;
      setZoom(typeof scale === "number" && Number.isFinite(scale) ? scale : readZoom(canvas));
    };
    modeler.on("canvas.viewbox.changed", sync);
    setZoom(readZoom(canvas));
    return () => modeler.off("canvas.viewbox.changed", sync);
  }, [modeler]);

  const stepZoom = (direction: 1 | -1) => modeler.get<ZoomScroll>("zoomScroll").stepZoom(direction);
  const resetZoom = () => modeler.get<Canvas>("canvas").zoom(1);
  const fitToView = () => modeler.fitToView();

  const percent = Math.round(zoom * 100);
  const atMinimum = zoom <= MIN_ZOOM + LIMIT_TOLERANCE;
  const atMaximum = zoom >= MAX_ZOOM - LIMIT_TOLERANCE;

  // aria-disabled instead of disabled: a focused button that turns disabled drops keyboard focus.
  return (
    <div className="tt-zoom" role="group" aria-label="Zoom">
      <button
        type="button"
        className="tt-zoom__btn"
        aria-label="Zoom out"
        aria-keyshortcuts="-"
        aria-disabled={atMinimum || undefined}
        title="Zoom out (-)"
        onClick={() => {
          if (!atMinimum) stepZoom(-1);
        }}
      >
        <Icon icon={Minus} />
      </button>
      <button
        type="button"
        className="tt-zoom__btn tt-zoom__btn--value"
        aria-label={`Zoom to 100% (now ${percent}%)`}
        aria-keyshortcuts="Shift+0"
        title="Zoom to 100% (Shift+0)"
        onClick={resetZoom}
      >
        {percent}%
      </button>
      <button
        type="button"
        className="tt-zoom__btn"
        aria-label="Zoom in"
        aria-keyshortcuts="+"
        aria-disabled={atMaximum || undefined}
        title="Zoom in (+)"
        onClick={() => {
          if (!atMaximum) stepZoom(1);
        }}
      >
        <Icon icon={Plus} />
      </button>
      <span className="tt-zoom__sep" aria-hidden="true" />
      <button
        type="button"
        className="tt-zoom__btn"
        aria-label="Fit the diagram to the window"
        aria-keyshortcuts="Shift+1"
        title="Fit to window (Shift+1)"
        onClick={fitToView}
      >
        <Icon icon={Maximize} />
      </button>
    </div>
  );
}
