/**
 * A non-blocking welcome card that overlays the canvas whenever the diagram is
 * empty (fresh start, "New diagram", or a cleared autosave). It reassures a
 * first-time visitor that nothing is broken and offers a one-click example,
 * while letting clicks and file drops fall through to the canvas so modelling
 * can start right away. It disappears as soon as the first element exists.
 */

import { SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";
import { useModeler } from "@/state/modelerContext";
import { toast } from "./toast";

export function EmptyState() {
  const { modeler, isEmpty } = useModeler();

  if (!isEmpty) return null;

  const loadExample = () => {
    modeler.importDocument(SAMPLE_DOCUMENT);
    toast("Loaded example diagram", "info");
  };

  return (
    <div className="tt-empty" role="region" aria-label="Empty canvas">
      <div className="tt-empty__card">
        <span className="tt-empty__mark" aria-hidden>
          ⬡
        </span>
        <h2 className="tt-empty__title">Your canvas is empty</h2>
        <p className="tt-empty__text">
          Model your organisation as four team types connected by three interaction modes. Start
          from the example, pick a shape from the palette above, or drop a JSON file here.
        </p>
        <button
          type="button"
          className="tt-btn tt-btn--primary tt-empty__cta"
          onClick={loadExample}
        >
          Show example
        </button>
        <span className="tt-empty__hint">Drag &amp; drop a .json file to open it</span>
      </div>
    </div>
  );
}
