import type { ModuleDeclaration } from "didi";
import type CommandStack from "diagram-js/lib/command/CommandStack";

import ModelingModule from "diagram-js/lib/features/modeling";
import MoveModule from "diagram-js/lib/features/move";
import OutlineModule from "diagram-js/lib/features/outline";
import ResizeModule from "diagram-js/lib/features/resize";

import { NavigatedViewer } from "./NavigatedViewer.js";
import { ttModelingModule } from "./modeling/index.js";
import { ttRulesModule } from "./rules/index.js";
import { ttBehaviorsModule } from "./behaviors/index.js";
import { ttPaletteModule } from "./palette/index.js";
import { ttContextPadModule } from "./context-pad/index.js";
import { ttLabelEditingModule } from "./label-editing/index.js";
import { ttKeyboardModule } from "./keyboard/index.js";
import { ttCopyPasteModule } from "./copy-paste/index.js";
import { ttZOrderModule } from "./zorder/index.js";

/**
 * Full Team Topologies editor: palette/create, move, resize, connect with
 * rules, context pad, inline label editing, undo/redo.
 */
export class Modeler extends NavigatedViewer {
  protected override _getModules(): ModuleDeclaration[] {
    return [
      ...super._getModules(),
      // diagram-js stock
      ModelingModule,
      MoveModule,
      OutlineModule,
      ResizeModule,
      // Team Topologies editor
      ttModelingModule,
      ttRulesModule,
      ttBehaviorsModule,
      ttPaletteModule,
      ttContextPadModule,
      ttLabelEditingModule,
      ttKeyboardModule,
      ttCopyPasteModule,
      ttZOrderModule,
    ];
  }

  undo(): void {
    this.get<CommandStack>("commandStack").undo();
  }

  redo(): void {
    this.get<CommandStack>("commandStack").redo();
  }

  canUndo(): boolean {
    return this.get<CommandStack>("commandStack").canUndo();
  }

  canRedo(): boolean {
    return this.get<CommandStack>("commandStack").canRedo();
  }
}
