import type { ModuleDeclaration } from "didi";
import CopyPasteModule from "diagram-js/lib/features/copy-paste";
import TtCopyPaste from "./TtCopyPaste.js";
import TtCopyPasteProps from "./TtCopyPasteProps.js";

/**
 * Copy-paste of Team Topologies shapes: the stock diagram-js feature (clipboard,
 * cursor-follow placement) with `copyPaste` overridden to mint model-style ids
 * and a listener that preserves the flat `tt*` props across the round-trip.
 */
export const ttCopyPasteModule: ModuleDeclaration = {
  __depends__: [CopyPasteModule],
  __init__: ["ttCopyPasteProps"],
  copyPaste: ["type", TtCopyPaste],
  ttCopyPasteProps: ["type", TtCopyPasteProps],
};

export { default as TtCopyPaste } from "./TtCopyPaste.js";
