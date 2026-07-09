/**
 * Hosts the diagram-js modeler: mounts its container into the DOM and resolves
 * the initial document (shared link → autosave → empty). A first-time visitor
 * lands on an empty canvas fronted by the EmptyState welcome card (which offers
 * the bundled example), rather than a pre-filled diagram they'd have to clear.
 * All interaction (palette, connect, resize, label editing) lives inside the
 * modeler.
 */

import { useEffect, useRef } from "react";
import { emptyDocument } from "@miragon/team-topologies-schema-model";
import { useModeler } from "@/state/modelerContext";
import { loadFromStorage } from "@/state/persistence";
import { readDocumentFromLocation, writeDocumentToLocation } from "@/io/url";

export function DiagramCanvas() {
  const { modeler } = useModeler();
  const hostRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || initialized.current) return;
    initialized.current = true;

    modeler.attachTo(host);

    // Debug/e2e surface: a typed handle on the modeler so tests can drive the canvas
    // (import/export/saveSVG) without depending on the renderer package or DOM selectors.
    (globalThis as Record<string, unknown>).__ttModeler = modeler;

    // Priority: a shared link → the local autosave → an empty canvas (the
    // EmptyState card then welcomes the user and offers the example).
    modeler.importDocument(readDocumentFromLocation() ?? loadFromStorage() ?? emptyDocument());
    // Seed the address bar so the URL is a shareable snapshot from the start
    // (whatever the source), then it stays in sync via the autosave.
    writeDocumentToLocation(modeler.exportDocument());
  }, [modeler]);

  return <div className="tt-canvas" ref={hostRef} />;
}
