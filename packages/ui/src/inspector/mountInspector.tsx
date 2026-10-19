import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { InspectorSlotContent, type InspectorSlot } from "./Inspector";

export interface MountedInspector {
  /** Shows the values but disables every control that changes them, while the host can't save. */
  setReadOnly(readOnly: boolean): void;
  /** Unmounts the content; the panel itself stays the host's. */
  destroy(): void;
}

/**
 * Mounts the inspector's content into a host's panel (the modeler shell's `shell.inspector`), one
 * React root for the panel's lifetime. Hosts call `destroy()` with the diagram, so no root
 * outlives the chrome around it.
 */
export function mountInspector(slot: InspectorSlot, modeler: Modeler): MountedInspector {
  const root = createRoot(slot.element);
  let readOnly = false;
  let destroyed = false;
  const render = () =>
    root.render(
      <StrictMode>
        <InspectorSlotContent modeler={modeler} slot={slot} readOnly={readOnly} />
      </StrictMode>,
    );
  render();
  return {
    setReadOnly(next) {
      if (destroyed || next === readOnly) return;
      readOnly = next;
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
    },
  };
}
