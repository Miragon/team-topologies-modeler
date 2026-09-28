import type { ModuleDeclaration } from "didi";
import PaletteModule from "diagram-js/lib/features/palette";
import CreateModule from "diagram-js/lib/features/create";
import LassoToolModule from "diagram-js/lib/features/lasso-tool";
import TtPaletteProvider from "./TtPaletteProvider.js";

/** Tool palette (lasso, drag-to-create teams, interactions, flows and annotations). */
export const ttPaletteModule: ModuleDeclaration = {
  __depends__: [PaletteModule, CreateModule, LassoToolModule],
  __init__: ["ttPaletteProvider"],
  ttPaletteProvider: ["type", TtPaletteProvider],
};

export { default as TtPaletteProvider } from "./TtPaletteProvider.js";
