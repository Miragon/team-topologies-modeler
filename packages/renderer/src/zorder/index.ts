import type { ModuleDeclaration } from "didi";
import TtZOrder from "./TtZOrder.js";

/** Keeps the fixed stacking order (interactions on top, base teams at the back). */
export const ttZOrderModule: ModuleDeclaration = {
  __init__: ["ttZOrder"],
  ttZOrder: ["type", TtZOrder],
};

export { default as TtZOrder } from "./TtZOrder.js";
