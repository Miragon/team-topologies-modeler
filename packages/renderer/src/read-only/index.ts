import type { ModuleDeclaration } from "didi";
import RulesModule from "diagram-js/lib/features/rules";
import TtReadOnly from "./TtReadOnly.js";

/** The canvas edit lock (an invalid file in an IDE host). */
export const ttReadOnlyModule: ModuleDeclaration = {
  __depends__: [RulesModule],
  __init__: ["ttReadOnly"],
  ttReadOnly: ["type", TtReadOnly],
};

export { default as TtReadOnly, READ_ONLY_CHANGED_EVENT } from "./TtReadOnly.js";
