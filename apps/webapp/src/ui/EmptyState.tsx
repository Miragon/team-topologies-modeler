/**
 * A non-blocking welcome card that overlays the canvas on a fresh start. It
 * offers exactly two actions — a primary "New file" that dismisses the card so
 * modelling can begin on the blank canvas, and a "Show example" that loads the
 * bundled topology. Opening a file lives in the menu, not here. Clicks and file
 * drops fall through to the canvas, and the card disappears once the first
 * element exists or the user starts a new file.
 */

import { SAMPLE_DOCUMENT, emptyDocument } from "@miragon/team-topologies-schema-model";
import { useModeler } from "@/state/modelerContext";
import { useUiStore } from "./uiStore";
import { toast } from "./toast";

export function EmptyState() {
  const { modeler, isEmpty } = useModeler();
  const welcomeDismissed = useUiStore((s) => s.welcomeDismissed);
  const dismissWelcome = useUiStore((s) => s.dismissWelcome);

  if (!isEmpty || welcomeDismissed) return null;

  const newDiagram = () => {
    modeler.importDocument(emptyDocument());
    dismissWelcome();
  };

  const loadExample = () => {
    modeler.importDocument(SAMPLE_DOCUMENT);
    toast("Loaded example diagram", "info");
  };

  return (
    <div className="tt-empty" role="region" aria-label="Empty canvas">
      <div className="tt-empty__card">
        <img
          className="tt-empty__mark"
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          width={60}
          height={60}
          alt=""
          aria-hidden
        />
        <h2 className="tt-empty__title">Team Topologies</h2>
        <p className="tt-empty__text">Start a new diagram, or open the example.</p>
        <div className="tt-empty__actions">
          <button
            type="button"
            className="tt-btn tt-btn--primary tt-empty__new"
            onClick={newDiagram}
          >
            New diagram
          </button>
          <button
            type="button"
            className="tt-btn tt-btn--ghost tt-empty__example"
            onClick={loadExample}
          >
            Show example
          </button>
        </div>
        <span className="tt-empty__hint">Drag &amp; drop a .json file to open it</span>
      </div>
    </div>
  );
}
