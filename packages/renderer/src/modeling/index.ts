import type { ModuleDeclaration } from "didi";
import ModelingModule from "diagram-js/lib/features/modeling";
import TtModeling from "./TtModeling.js";
import TtLayouter from "./TtLayouter.js";

/**
 * High-level Team Topologies mutations + registration of the command handlers.
 * Depends on the diagram-js modeling module so our `layouter` replaces its
 * default one.
 */
export const ttModelingModule: ModuleDeclaration = {
  __depends__: [ModelingModule],
  __init__: ["ttModeling"],
  ttModeling: ["type", TtModeling],
  layouter: ["type", TtLayouter],
};

export { default as TtModeling } from "./TtModeling.js";
export { default as TtLayouter } from "./TtLayouter.js";
