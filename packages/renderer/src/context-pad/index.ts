import type { ModuleDeclaration } from "didi";
import ConnectModule from "diagram-js/lib/features/connect";
import ConnectionPreviewModule from "diagram-js/lib/features/connection-preview";
import ContextPadModule from "diagram-js/lib/features/context-pad";
import TtContextPadProvider from "./TtContextPadProvider.js";

/** Per-element context actions (rename, annotate, attach, delete). */
export const ttContextPadModule: ModuleDeclaration = {
  __depends__: [ContextPadModule, ConnectModule, ConnectionPreviewModule],
  __init__: ["ttContextPadProvider"],
  ttContextPadProvider: ["type", TtContextPadProvider],
};

export { default as TtContextPadProvider } from "./TtContextPadProvider.js";
