/**
 * A non-blocking welcome card that overlays the canvas whenever the diagram is
 * empty (fresh start, "New diagram", or a cleared autosave). It reassures a
 * first-time visitor that nothing is broken and offers exactly two actions — a
 * blue primary "Show example" and a ghost "Open file…" — while letting clicks
 * and file drops fall through to the canvas so modelling can start right away.
 * It disappears as soon as the first element exists.
 */

import { useRef } from "react";
import { SAMPLE_DOCUMENT } from "@miragon/team-topologies-schema-model";
import { useModeler } from "@/state/modelerContext";
import { importJsonFile } from "@/io/json";
import { toast } from "./toast";

export function EmptyState() {
  const { modeler, isEmpty } = useModeler();
  const fileInput = useRef<HTMLInputElement>(null);

  if (!isEmpty) return null;

  const loadExample = () => {
    modeler.importDocument(SAMPLE_DOCUMENT);
    toast("Loaded example diagram", "info");
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await importJsonFile(file);
    if (result.ok) {
      modeler.importDocument(result.document);
      toast("Diagram imported", "success");
    } else {
      toast(`Import failed: ${result.error}`, "error");
    }
  };

  return (
    <div className="tt-empty" role="region" aria-label="Empty canvas">
      <div className="tt-empty__card">
        <img
          className="tt-empty__mark"
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          width={52}
          height={52}
          alt=""
          aria-hidden
        />
        <h2 className="tt-empty__title">Your canvas is empty</h2>
        <p className="tt-empty__text">
          Model your organisation as four team types connected by three interaction modes. Start
          from the example, pick a shape from the palette above, or drop a JSON file here.
        </p>
        <div className="tt-empty__actions">
          <button type="button" className="tt-btn tt-btn--primary" onClick={loadExample}>
            Show example
          </button>
          <button
            type="button"
            className="tt-btn tt-btn--ghost"
            onClick={() => fileInput.current?.click()}
          >
            Open file…
          </button>
        </div>
        <span className="tt-empty__hint">Drag &amp; drop a .json file to open it</span>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={onFileChange}
      />
    </div>
  );
}
