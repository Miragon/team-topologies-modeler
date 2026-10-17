import { useEffect, useState } from "react";
import { isTtElement, type Modeler, type TtElement } from "@miragon/team-topologies-renderer";
import type Selection from "diagram-js/lib/features/selection/Selection";

export interface ModelerSelection {
  /** The one selected element the inspector edits; null for none or several. */
  selected: TtElement | null;
  /** Bumped on every model change, so consumers re-read live element props. */
  revision: number;
}

function singleElement(selection: readonly unknown[]): TtElement | null {
  const only = selection.length === 1 ? selection[0] : undefined;
  return isTtElement(only) ? only : null;
}

/** Mirrors the modeler's selection and model changes into React state, for the inspector props. */
export function useModelerSelection(modeler: Modeler): ModelerSelection {
  const [selected, setSelected] = useState<TtElement | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onSelection = (event: unknown) => {
      setSelected(singleElement((event as { newSelection?: unknown[] }).newSelection ?? []));
    };
    const bump = () => setRevision((current) => current + 1);

    modeler.on("selection.changed", onSelection);
    modeler.on("commandStack.changed", bump);
    modeler.on("elements.changed", bump);
    modeler.on("import.done", bump);
    // A host may mount after the user already selected something.
    setSelected(singleElement(modeler.get<Selection>("selection").get()));
    return () => {
      modeler.off("selection.changed", onSelection);
      modeler.off("commandStack.changed", bump);
      modeler.off("elements.changed", bump);
      modeler.off("import.done", bump);
    };
  }, [modeler]);

  return { selected, revision };
}
