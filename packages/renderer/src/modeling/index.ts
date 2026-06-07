import type { ModuleDeclaration } from "didi";
import TtModeling from "./TtModeling.js";

/** High-level Team Topologies mutations + registration of the command handlers. */
export const ttModelingModule: ModuleDeclaration = {
  __init__: ["ttModeling"],
  ttModeling: ["type", TtModeling],
};

export { default as TtModeling } from "./TtModeling.js";
