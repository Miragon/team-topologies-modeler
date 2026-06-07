/**
 * Hosts the diagram-js modeler: mounts its container into the DOM and resolves
 * the initial document (shared link → autosave → example). All interaction
 * (palette, connect, resize, label editing) lives inside the modeler.
 */

import { useEffect, useRef } from "react";
import { SAMPLE_DOCUMENT } from "@tt-modeler/model";
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

    // Priority: a shared link → the local autosave → the bundled example.
    modeler.importDocument(
      readDocumentFromLocation() ?? loadFromStorage() ?? SAMPLE_DOCUMENT,
    );
    // Seed the address bar so the URL is a shareable snapshot from the start
    // (whatever the source), then it stays in sync via the autosave.
    writeDocumentToLocation(modeler.exportDocument());
  }, [modeler]);

  return <div className="tt-canvas" ref={hostRef} />;
}
