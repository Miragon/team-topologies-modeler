import type { ModuleDeclaration } from "didi";
import TtKeyboard from "./TtKeyboard.js";

/** Canvas shortcuts: history, selection, clipboard, nudging and zoom (see TtKeyboard). */
export const ttKeyboardModule: ModuleDeclaration = {
  __init__: ["ttKeyboard"],
  ttKeyboard: ["type", TtKeyboard],
};

export { default as TtKeyboard } from "./TtKeyboard.js";
