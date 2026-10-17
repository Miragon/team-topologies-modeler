import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import type { Modeler } from "@miragon/team-topologies-renderer";
import { Inspector, Legend, useModelerSelection } from "@miragon/team-topologies-ui";
import type { LegendState } from "./legendState.js";

interface PanelsProps {
  modeler: Modeler;
  legend: LegendState;
  focusMenuTrigger: () => void;
}

export interface PanelsHandle {
  /** While the file can't be saved, the inspector shows its values without letting them change. */
  setReadOnly(readOnly: boolean): void;
}

function Panels({
  modeler,
  legend,
  focusMenuTrigger,
  readOnly,
}: PanelsProps & { readOnly: boolean }) {
  const { selected, revision } = useModelerSelection(modeler);
  const legendOpen = useSyncExternalStore(legend.subscribe, legend.isOpen);

  return (
    <>
      <Inspector modeler={modeler} selected={selected} revision={revision} readOnly={readOnly} />
      <Legend
        open={legendOpen}
        onClose={() => legend.setOpen(false)}
        onRequestFocusReturn={focusMenuTrigger}
      />
    </>
  );
}

export function mountPanels(host: HTMLElement, props: PanelsProps): PanelsHandle {
  const root = createRoot(host);
  const render = (readOnly: boolean): void =>
    root.render(
      <StrictMode>
        <Panels {...props} readOnly={readOnly} />
      </StrictMode>,
    );
  render(false);
  return { setReadOnly: render };
}
