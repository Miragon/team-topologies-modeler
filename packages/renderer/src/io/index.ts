import type { ModuleDeclaration } from "didi";
import TtImporter from "./TtImporter.js";
import TtExporter from "./TtExporter.js";
import TtViewport from "./TtViewport.js";

/** Document <-> diagram-js bridge (import / export) and the palette-aware fit. */
export const ioModule: ModuleDeclaration = {
  ttImporter: ["type", TtImporter],
  ttExporter: ["type", TtExporter],
  ttViewport: ["type", TtViewport],
};

export { default as TtImporter } from "./TtImporter.js";
export { default as TtExporter } from "./TtExporter.js";
export { default as TtViewport } from "./TtViewport.js";
export { saveSVG } from "./saveSvg.js";
export { GEIST_UNICODE_RANGES, embedSvgStyles, geistFontFaceCss } from "./fontEmbedding.js";
export type { GeistFontDataUrls } from "./fontEmbedding.js";
export { ROOT_ID } from "./types.js";
export type { ImportWarning, RootBusinessObject } from "./types.js";
