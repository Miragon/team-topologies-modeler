/**
 * Hosts the diagram-js modeler: mounts its container into the DOM and loads the initial document
 * (shared link → autosave → empty, see state/boot.ts). All interaction (palette, connect, resize,
 * label editing) lives inside the modeler.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { useModeler } from "@/state/modelerContext";
import { bootModeler } from "@/state/boot";
import { isEmptyDocument } from "@/state/replace";
import { useUiStore } from "./uiStore";

/**
 * `inert` while the welcome card fronts the canvas: the hidden canvas is no Tab stop and its
 * shortcuts stay off. File drops still work, because the drop zone listens on the window.
 */
export function DiagramCanvas({ inert = false }: { inert?: boolean }) {
  const { modeler } = useModeler();
  const hostRef = useRef<HTMLElement>(null);
  const initialized = useRef(false);

  // A layout effect, so the welcome decision lands before the first paint and the working chrome
  // never flashes up behind the welcome card.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || initialized.current) return;
    initialized.current = true;

    modeler.attachTo(host);

    // Debug/e2e surface: a typed handle on the modeler so tests can drive the canvas
    // (import/export/saveSVG) without depending on the renderer package or DOM selectors.
    (globalThis as Record<string, unknown>).__ttModeler = modeler;

    bootModeler(modeler);
  }, [modeler]);

  // The first real edit, or any non-empty import, ends the fresh start for this session. The
  // command stack also reports a "clear" on every import, which is not the user's doing.
  useEffect(() => {
    const dismissWelcome = () => useUiStore.getState().dismissWelcome();
    const onCommandStack = (event: { trigger?: string | null }) => {
      if (event.trigger !== "clear") dismissWelcome();
    };
    const onImport = () => {
      if (!isEmptyDocument(modeler.exportDocument())) dismissWelcome();
    };
    modeler.on("commandStack.changed", onCommandStack);
    modeler.on("import.done", onImport);
    return () => {
      modeler.off("commandStack.changed", onCommandStack as (event: unknown) => void);
      modeler.off("import.done", onImport);
    };
  }, [modeler]);

  return <main className="tt-canvas" aria-label="Diagram canvas" ref={hostRef} inert={inert} />;
}
