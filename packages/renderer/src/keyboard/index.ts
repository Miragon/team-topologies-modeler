import type { ModuleDeclaration } from "didi";
import TtKeyboard from "./TtKeyboard.js";

/** Undo/redo + delete-selection on the canvas container. */
export const ttKeyboardModule: ModuleDeclaration = {
  __init__: ["ttKeyboard"],
  ttKeyboard: ["type", TtKeyboard],
};

export { default as TtKeyboard } from "./TtKeyboard.js";
