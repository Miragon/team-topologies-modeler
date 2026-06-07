import type { ModuleDeclaration } from "didi";
import PaletteModule from "diagram-js/lib/features/palette";
import CreateModule from "diagram-js/lib/features/create";
import TtPaletteProvider from "./TtPaletteProvider.js";

/** Tool palette (drag-to-create teams, pick interaction mode). */
export const ttPaletteModule: ModuleDeclaration = {
  __depends__: [PaletteModule, CreateModule],
  __init__: ["ttPaletteProvider"],
  ttPaletteProvider: ["type", TtPaletteProvider],
};

export { default as TtPaletteProvider } from "./TtPaletteProvider.js";
