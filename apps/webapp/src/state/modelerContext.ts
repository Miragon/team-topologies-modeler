/**
 * The React context + hook for the diagram-js modeler, kept in its own
 * (component-free) module so Fast Refresh stays stable: editing the provider
 * never swaps the context identity out from under its consumers.
 */

import { createContext, useContext } from "react";
import type { Modeler, TtElement } from "@tt-modeler/renderer";

export type Selected = TtElement | null;

export interface ModelerContextValue {
  modeler: Modeler;
  selected: Selected;
  canUndo: boolean;
  canRedo: boolean;
  title: string;
  /** Bumped on every model change so consumers re-read live element props. */
  revision: number;
  setTitle: (title: string) => void;
}

export const ModelerContext = createContext<ModelerContextValue | null>(null);

export function useModeler(): ModelerContextValue {
  const ctx = useContext(ModelerContext);
  if (!ctx) throw new Error("useModeler must be used within <ModelerProvider>");
  return ctx;
}
