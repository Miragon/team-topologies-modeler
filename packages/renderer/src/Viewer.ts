import type { ModuleDeclaration } from "didi";
import { TtBaseViewer } from "./TtBaseViewer.js";
import { ttModelModule } from "./model/index.js";
import { ttDrawModule } from "./draw/index.js";
import { ioModule } from "./io/index.js";

/** Read-only renderer: draws a Team Topologies diagram with no interaction. */
export class Viewer extends TtBaseViewer {
  protected _getModules(): ModuleDeclaration[] {
    return [ttModelModule, ttDrawModule, ioModule];
  }
}
