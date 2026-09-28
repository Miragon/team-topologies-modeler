import type { ModuleDeclaration } from "didi";
import CroppingConnectionDocking from "diagram-js/lib/layout/CroppingConnectionDocking";
import TeamTopologiesRenderer from "./TeamTopologiesRenderer.js";

/**
 * SVG rendering of all Team Topologies element types (BaseRenderer, priority
 * 1500), plus the docking that crops annotation connectors to the outlines of
 * the shapes they join.
 */
export const ttDrawModule: ModuleDeclaration = {
  __init__: ["ttRenderer"],
  ttRenderer: ["type", TeamTopologiesRenderer],
  connectionDocking: ["type", CroppingConnectionDocking],
};

export { default as TeamTopologiesRenderer } from "./TeamTopologiesRenderer.js";
