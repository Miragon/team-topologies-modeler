import type { ModuleDeclaration } from "didi";
import TeamTopologiesRenderer from "./TeamTopologiesRenderer.js";

/** SVG rendering of all Team Topologies element types (BaseRenderer, priority 1500). */
export const ttDrawModule: ModuleDeclaration = {
  __init__: ["ttRenderer"],
  ttRenderer: ["type", TeamTopologiesRenderer],
};

export { default as TeamTopologiesRenderer } from "./TeamTopologiesRenderer.js";
