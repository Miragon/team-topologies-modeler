import type { ModuleDeclaration } from "didi";
import TtKeyboard from "./TtKeyboard.js";

/** Canvas shortcuts: history, selection, clipboard and nudging (see TtKeyboard). */
export const ttKeyboardModule: ModuleDeclaration = {
  __init__: ["ttKeyboard"],
  ttKeyboard: ["type", TtKeyboard],
};

export { default as TtKeyboard } from "./TtKeyboard.js";
export type { TtKeyboardConfig } from "./TtKeyboard.js";
