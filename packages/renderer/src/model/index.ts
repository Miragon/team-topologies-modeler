import type { ModuleDeclaration } from "didi";
import TtElementFactory from "./TtElementFactory.js";

/** Element factory with Team Topologies defaults. */
export const ttModelModule: ModuleDeclaration = {
  ttElementFactory: ["type", TtElementFactory],
};

export { default as TtElementFactory } from "./TtElementFactory.js";
export * from "./di-types.js";
