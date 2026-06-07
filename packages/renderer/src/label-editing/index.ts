import type { ModuleDeclaration } from "didi";
import TtLabelEditing from "./TtLabelEditing.js";

/** Inline label editing (double-click a team to rename). */
export const ttLabelEditingModule: ModuleDeclaration = {
  __init__: ["ttLabelEditing"],
  ttLabelEditing: ["type", TtLabelEditing],
};

export { default as TtLabelEditing } from "./TtLabelEditing.js";
