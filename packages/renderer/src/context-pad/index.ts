import type { ModuleDeclaration } from "didi";
import ContextPadModule from "diagram-js/lib/features/context-pad";
import TtContextPadProvider from "./TtContextPadProvider.js";

/** Per-element context actions (rename, delete). */
export const ttContextPadModule: ModuleDeclaration = {
  __depends__: [ContextPadModule],
  __init__: ["ttContextPadProvider"],
  ttContextPadProvider: ["type", TtContextPadProvider],
};

export { default as TtContextPadProvider } from "./TtContextPadProvider.js";
