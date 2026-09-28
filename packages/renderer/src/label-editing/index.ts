import type { ModuleDeclaration } from "didi";
import TtLabelEditing from "./TtLabelEditing.js";

/** In-place label editing (double-click any element to edit its label or text). */
export const ttLabelEditingModule: ModuleDeclaration = {
  __init__: ["ttLabelEditing"],
  ttLabelEditing: ["type", TtLabelEditing],
};

export { default as TtLabelEditing } from "./TtLabelEditing.js";
