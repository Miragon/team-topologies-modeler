/**
 * React glue around the framework-agnostic diagram-js `Modeler`. Creates a
 * single modeler instance, mirrors its events (selection, history, changes)
 * into React state, drives autosave, and provides it via context so the chrome
 * (menu, inspector, share) can drive the canvas. The context + hook live in
 * `modelerContext.ts` so this file exports only a component (Fast Refresh safe).
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modeler, isTtElement } from "@miragon/team-topologies-renderer";
import { saveToStorage } from "./persistence";
import { writeDocumentToLocation } from "@/io/url";
import { ModelerContext, type ModelerContextValue, type Selected } from "./modelerContext";

export function ModelerProvider({ children }: { children: ReactNode }) {
  const modelerRef = useRef<Modeler>();
  // Fill the full-bleed `.tt-canvas` host. Without an explicit height the
  // renderer falls back to its standalone 600px default (it's created detached
  // and only attached later via `attachTo`, so it can't infer the host size).
  if (!modelerRef.current) modelerRef.current = new Modeler({ height: "100%" });
  const modeler = modelerRef.current;

  const [selected, setSelected] = useState<Selected>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [title, setTitleState] = useState("Untitled team topology");
  const [revision, setRevision] = useState(0);

  // Debounced autosave of the current document: to localStorage (so a refresh
  // never loses work) and into the address-bar hash (so the URL is always a
  // shareable/bookmarkable snapshot, no Share click required).
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const persist = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const doc = modeler.exportDocument();
      saveToStorage(doc);
      writeDocumentToLocation(doc);
    }, 600);
  };

  useEffect(() => {
    const syncHistory = () => {
      setCanUndo(modeler.canUndo());
      setCanRedo(modeler.canRedo());
    };
    const bump = () => setRevision((r) => r + 1);
    const syncTitle = () => setTitleState(modeler.getMeta()?.title ?? "Untitled team topology");

    const onSelection = (e: unknown) => {
      const sel = (e as { newSelection?: unknown[] }).newSelection?.[0];
      setSelected(isTtElement(sel) ? (sel as Selected) : null);
    };
    const onCommandStack = () => {
      syncHistory();
      bump();
      persist();
    };
    const onElements = () => bump();
    const onImport = () => {
      syncHistory();
      syncTitle();
      bump();
      // New / Example / Import-file / shared-link all re-import: keep the
      // autosave + address-bar hash in step with the freshly loaded document.
      persist();
    };

    modeler.on("selection.changed", onSelection);
    modeler.on("commandStack.changed", onCommandStack);
    modeler.on("elements.changed", onElements);
    modeler.on("import.done", onImport);

    // Initial sync (the first import.done may fire before we subscribed).
    syncHistory();
    syncTitle();

    return () => {
      modeler.off("selection.changed", onSelection);
      modeler.off("commandStack.changed", onCommandStack);
      modeler.off("elements.changed", onElements);
      modeler.off("import.done", onImport);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeler]);

  const setTitle = (next: string) => {
    modeler.setMeta({ title: next });
    setTitleState(next);
    persist();
  };

  const value = useMemo<ModelerContextValue>(
    () => ({ modeler, selected, canUndo, canRedo, title, revision, setTitle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modeler, selected, canUndo, canRedo, title, revision],
  );

  return <ModelerContext.Provider value={value}>{children}</ModelerContext.Provider>;
}
