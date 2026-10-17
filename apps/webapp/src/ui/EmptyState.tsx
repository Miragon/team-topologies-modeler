/**
 * The start screen (guide §8): on a fresh start, a centred card with the Miragon Komet, exactly two
 * actions and a drop hint, while the working chrome stays hidden (`.tt-app--welcome`). It goes away
 * for the rest of the session as soon as the user starts, see uiStore `welcome`.
 */

import { Upload } from "lucide-react";
import { SAMPLE_DOCUMENT, emptyDocument } from "@miragon/team-topologies-schema-model";
import { Icon } from "@miragon/team-topologies-ui";
import { useModeler } from "@/state/modelerContext";
import { replaceDocument } from "@/state/replace";
import { useUiStore } from "./uiStore";

export function EmptyState() {
  const { modeler } = useModeler();
  const welcome = useUiStore((s) => s.welcome);

  if (welcome !== "visible") return null;

  return (
    <section className="tt-empty" aria-labelledby="tt-empty-title">
      <div className="tt-empty__card">
        <img
          className="tt-empty__mark"
          src={`${import.meta.env.BASE_URL}miragon-komet-blau.svg`}
          width={64}
          height={64}
          alt=""
        />
        <h1 id="tt-empty-title" className="tt-empty__title">
          Miragon Modeler for Team Topologies
        </h1>
        <p className="tt-empty__text">Start a new diagram, or explore the example.</p>
        <div className="tt-empty__actions">
          <button
            type="button"
            className="tt-btn tt-btn--primary tt-empty__new"
            onClick={() => void replaceDocument(modeler, emptyDocument(), { kind: "new" })}
          >
            New diagram
          </button>
          <button
            type="button"
            className="tt-btn tt-btn--ghost tt-empty__example"
            onClick={() => void replaceDocument(modeler, SAMPLE_DOCUMENT, { kind: "example" })}
          >
            Show example
          </button>
        </div>
        <span className="tt-empty__hint">
          <Icon icon={Upload} />
          Or drop a .tt or .ttm.json file here
        </span>
      </div>
    </section>
  );
}
