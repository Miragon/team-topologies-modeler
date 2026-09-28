import type { ModuleDeclaration } from "didi";
import TtFlatModelBehavior from "./TtFlatModelBehavior.js";
import TtAssociationBehavior from "./TtAssociationBehavior.js";

/**
 * Editing behaviors that keep the Team Topologies model flat (no nesting) and
 * annotation connectors cropped and one per annotation.
 */
export const ttBehaviorsModule: ModuleDeclaration = {
  __init__: ["ttFlatModelBehavior", "ttAssociationBehavior"],
  ttFlatModelBehavior: ["type", TtFlatModelBehavior],
  ttAssociationBehavior: ["type", TtAssociationBehavior],
};

export { default as TtFlatModelBehavior } from "./TtFlatModelBehavior.js";
export { default as TtAssociationBehavior } from "./TtAssociationBehavior.js";
