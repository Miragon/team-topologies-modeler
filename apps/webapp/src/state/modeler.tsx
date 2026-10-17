/**
 * React glue around the framework-agnostic diagram-js `Modeler`. Creates a
 * single modeler instance, mirrors its events (selection, history, changes)
 * into React state, drives autosave, and provides it via context so the chrome
 * (menu, inspector, share) can drive the canvas. The context + hook live in
 * `modelerContext.ts` so this file exports only a component (Fast Refresh safe).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modeler } from "@miragon/team-topologies-renderer";
import { useModelerSelection } from "@miragon/team-topologies-ui";
import { saveToStorage } from "./persistence";
import { writeDocumentToLocation } from "@/io/url";
import { ModelerContext, type ModelerContextValue } from "./modelerContext";

/** Matches the static <title> in index.html. */
const PRODUCT_NAME = "Miragon Modeler for Team Topologies";
const AUTOSAVE_DELAY_MS = 600;

export function ModelerProvider({ children }: { children: ReactNode }) {
  const modelerRef = useRef<Modeler>(undefined);
  // Fill the full-bleed `.tt-canvas` host. Without an explicit height the
  // renderer falls back to its standalone 600px default (it's created detached
  // and only attached later via `attachTo`, so it can't infer the host size).
  if (!modelerRef.current) modelerRef.current = new Modeler({ height: "100%" });
  const modeler = modelerRef.current;

  const { selected, revision } = useModelerSelection(modeler);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [title, setTitleState] = useState("Untitled team topology");

  // Debounced autosave of the current document: to localStorage (so a refresh
  // never loses work) and into the address-bar hash (so the URL is always a
  // shareable/bookmarkable snapshot, no Share click required).
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveNow = () => {
    saveTimer.current = undefined;
    const doc = modeler.exportDocument();
    saveToStorage(doc);
    writeDocumentToLocation(doc);
  };
  const persist = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, AUTOSAVE_DELAY_MS);
  };
  // Closing or hiding the tab inside the debounce window would otherwise lose the last edit.
  const flushPendingSave = () => {
    if (!saveTimer.current) return;
    clearTimeout(saveTimer.current);
    saveNow();
  };

  useEffect(() => {
    const syncHistory = () => {
      setCanUndo(modeler.canUndo());
      setCanRedo(modeler.canRedo());
    };
    const syncTitle = () => setTitleState(modeler.getMeta()?.title ?? "Untitled team topology");

    const onCommandStack = () => {
      syncHistory();
      persist();
    };
    const onImport = () => {
      syncHistory();
      syncTitle();
      // New / Example / Import-file / shared-link all re-import: keep the
      // autosave + address-bar hash in step with the freshly loaded document.
      persist();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushPendingSave();
    };

    modeler.on("commandStack.changed", onCommandStack);
    modeler.on("import.done", onImport);
    window.addEventListener("pagehide", flushPendingSave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Initial sync (the first import.done may fire before we subscribed). This
    // effect runs after DiagramCanvas has attached + imported, so reading the
    // document here is safe.
    syncHistory();
    syncTitle();

    return () => {
      modeler.off("commandStack.changed", onCommandStack);
      modeler.off("import.done", onImport);
      window.removeEventListener("pagehide", flushPendingSave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeler]);

  const setTitle = (next: string) => {
    modeler.setMeta({ title: next });
    setTitleState(next);
    persist();
  };

  useEffect(() => {
    const name = title.trim();
    document.title = name ? `${name} · ${PRODUCT_NAME}` : PRODUCT_NAME;
  }, [title]);

  const value = useMemo<ModelerContextValue>(
    () => ({ modeler, selected, canUndo, canRedo, title, revision, setTitle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modeler, selected, canUndo, canRedo, title, revision],
  );

  return <ModelerContext.Provider value={value}>{children}</ModelerContext.Provider>;
}
