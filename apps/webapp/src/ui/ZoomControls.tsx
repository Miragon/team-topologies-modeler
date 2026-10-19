/**
 * Bottom-right zoom control (guide §5): zoom out, the current zoom level (click for 100 %), zoom
 * in, and fit the diagram to the window. The steps are diagram-js's own wheel steps, so the
 * buttons, the zoom keys and the mouse wheel all land on the same levels and limits. The keys are
 * the guide's (§5.8): Cmd/Ctrl + `+`, `-` and `0` zoom the diagram instead of the page, Shift+1
 * fits; never inside a text field or an open dialog.
 */

import { useEffect, useState } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ZoomScroll from "diagram-js/lib/navigation/zoomscroll/ZoomScroll";
import { Icon } from "@miragon/team-topologies-ui";
import { useModeler } from "@/state/modelerContext";
import { IS_APPLE_PLATFORM } from "./platform";
import { isDialogOpen, useUiStore } from "./uiStore";

const MOD = IS_APPLE_PLATFORM ? "⌘" : "Ctrl+";
const ARIA_MOD = IS_APPLE_PLATFORM ? "Meta" : "Control";
const TEXT_FIELD_SELECTOR = "input, textarea, select, [contenteditable]";

type ZoomKey = "in" | "out" | "actual" | "fit";

function zoomKeyOf(event: KeyboardEvent): ZoomKey | undefined {
  if (event.altKey || event.isComposing) return undefined;
  const command = event.metaKey || event.ctrlKey;
  if (!command) return event.shiftKey && event.code === "Digit1" ? "fit" : undefined;
  if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") return "in";
  if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") return "out";
  if (event.key === "0" || event.code === "Numpad0") return "actual";
  return undefined;
}

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = zoomKeyOf(event);
      if (!key || useUiStore.getState().welcome !== "dismissed" || isDialogOpen()) return;
      if (event.target instanceof Element && event.target.closest(TEXT_FIELD_SELECTOR)) return;
      event.preventDefault();
      const canvas = modeler.get<Canvas>("canvas");
      const zoomNow = readZoom(canvas);
      if (key === "in" && zoomNow < MAX_ZOOM - LIMIT_TOLERANCE) stepZoom(1);
      else if (key === "out" && zoomNow > MIN_ZOOM + LIMIT_TOLERANCE) stepZoom(-1);
      else if (key === "actual") resetZoom();
      else if (key === "fit") fitToView();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeler]);

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
        aria-keyshortcuts={`${ARIA_MOD}+-`}
        aria-disabled={atMinimum || undefined}
        title={`Zoom out (${MOD}−)`}
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
        aria-keyshortcuts={`${ARIA_MOD}+0`}
        title={`Zoom to 100% (${MOD}0)`}
        onClick={resetZoom}
      >
        {percent}%
      </button>
      <button
        type="button"
        className="tt-zoom__btn"
        aria-label="Zoom in"
        aria-keyshortcuts={`${ARIA_MOD}+= ${ARIA_MOD}+Plus`}
        aria-disabled={atMaximum || undefined}
        title={`Zoom in (${MOD}+)`}
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
