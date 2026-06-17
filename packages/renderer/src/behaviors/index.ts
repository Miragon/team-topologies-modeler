import type { ModuleDeclaration } from "didi";
import TtFlatModelBehavior from "./TtFlatModelBehavior.js";

/** Editing behaviors that keep the Team Topologies model flat (no nesting). */
export const ttBehaviorsModule: ModuleDeclaration = {
  __init__: ["ttFlatModelBehavior"],
  ttFlatModelBehavior: ["type", TtFlatModelBehavior],
};

export { default as TtFlatModelBehavior } from "./TtFlatModelBehavior.js";
