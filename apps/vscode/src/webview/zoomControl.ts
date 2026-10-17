/**
 * Bottom-right zoom control: zoom out, the current level (click: back to 100 %), zoom in, and fit.
 * Steps go through diagram-js ZoomScroll, so they match the mouse wheel and the +/- shortcuts.
 */

import {
  ICON_MAXIMIZE,
  ICON_MINUS,
  ICON_PLUS,
  iconMarkup,
  type IconNode,
  type Modeler,
} from "@miragon/team-topologies-renderer";
import type Canvas from "diagram-js/lib/core/Canvas";
import type ZoomScroll from "diagram-js/lib/navigation/zoomscroll/ZoomScroll";

interface ViewboxChangedEvent {
  viewbox: { scale: number };
}

function zoomButton(className: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = title;
  button.addEventListener("click", onClick);
  return button;
}

function iconZoomButton(
  icon: IconNode,
  name: string,
  shortcut: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = zoomButton("zoom__btn", `${name} (${shortcut})`, onClick);
  button.setAttribute("aria-label", name);
  button.innerHTML = iconMarkup(icon);
  return button;
}

function formatZoomLevel(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

function showZoomLevel(level: HTMLButtonElement, scale: number): void {
  const percent = formatZoomLevel(scale);
  level.textContent = percent;
  level.setAttribute("aria-label", `Zoom to 100% (now ${percent})`);
}

export function mountZoomControl(host: HTMLElement, modeler: Modeler): void {
  const canvas = (): Canvas => modeler.get<Canvas>("canvas");
  const zoomScroll = (): ZoomScroll => modeler.get<ZoomScroll>("zoomScroll");

  const group = document.createElement("div");
  group.className = "zoom";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Zoom");

  // The level button shows the percentage; its name says what clicking it does.
  const level = zoomButton("zoom__btn zoom__btn--value", "Zoom to 100% (Shift+0)", () =>
    canvas().zoom(1),
  );
  showZoomLevel(level, 1);

  const separator = document.createElement("div");
  separator.className = "zoom__sep";
  separator.setAttribute("aria-hidden", "true");

  group.append(
    iconZoomButton(ICON_MINUS, "Zoom out", "-", () => zoomScroll().stepZoom(-1)),
    level,
    iconZoomButton(ICON_PLUS, "Zoom in", "+", () => zoomScroll().stepZoom(1)),
    separator,
    iconZoomButton(ICON_MAXIMIZE, "Fit to view", "Shift+1", () => modeler.fitToView()),
  );
  host.append(group);

  modeler.on<ViewboxChangedEvent>("canvas.viewbox.changed", (event) => {
    showZoomLevel(level, event.viewbox.scale);
  });
}
