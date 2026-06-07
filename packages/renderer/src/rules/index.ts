import type { ModuleDeclaration } from "didi";
import RulesModule from "diagram-js/lib/features/rules";
import TtRules from "./TtRules.js";

/** Team Topologies editing rules (connect, move, create, resize). */
export const ttRulesModule: ModuleDeclaration = {
  __depends__: [RulesModule],
  __init__: ["ttRules"],
  ttRules: ["type", TtRules],
};

export { default as TtRules } from "./TtRules.js";
