import type { ModuleDeclaration } from "didi";
import TtImporter from "./TtImporter.js";
import TtExporter from "./TtExporter.js";

/** Document <-> diagram-js bridge (import / export). */
export const ioModule: ModuleDeclaration = {
  ttImporter: ["type", TtImporter],
  ttExporter: ["type", TtExporter],
};

export { default as TtImporter } from "./TtImporter.js";
export { default as TtExporter } from "./TtExporter.js";
export { saveSVG } from "./saveSvg.js";
export { ROOT_ID } from "./types.js";
export type { ImportWarning, RootBusinessObject } from "./types.js";
