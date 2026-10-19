import * as vscode from "vscode";
import type { WebviewCommand } from "./protocol.js";

export const DIAGRAM_VIEW_TYPE = "teamTopologies.editor";
export const PNG_VIEW_TYPE = "teamTopologies.pngEditor";

/** The Command Palette commands that run the same handlers as the webview menu (guide §13.5). */
export const WEBVIEW_COMMANDS: Readonly<Record<WebviewCommand, string>> = {
  fitView: "teamTopologies.fitView",
  exportPng: "teamTopologies.exportPng",
  exportSvg: "teamTopologies.exportSvg",
};

/** Text and diagram side by side (guide §13.5), from the editor title of either editor. */
export const OPEN_SOURCE_COMMAND = "teamTopologies.openSource";
export const OPEN_DIAGRAM_COMMAND = "teamTopologies.openDiagram";

export const NO_DIAGRAM_MESSAGE = "Open a Team Topologies diagram in the diagram editor first.";

/**
 * Editor title buttons pass the editor's resource; the Command Palette passes nothing, so the
 * caller falls back to the focused diagram or text editor.
 */
function resourceArgument(argument: unknown): vscode.Uri | undefined {
  return argument instanceof vscode.Uri ? argument : undefined;
}

export function registerSideBySideCommands(
  activeDiagramUri: () => vscode.Uri | undefined,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(OPEN_SOURCE_COMMAND, (argument?: unknown) => {
      const uri = resourceArgument(argument) ?? activeDiagramUri();
      if (!uri) return void vscode.window.showInformationMessage(NO_DIAGRAM_MESSAGE);
      return vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        "default",
        vscode.ViewColumn.Beside,
      );
    }),
    vscode.commands.registerCommand(OPEN_DIAGRAM_COMMAND, (argument?: unknown) => {
      const uri = resourceArgument(argument) ?? vscode.window.activeTextEditor?.document.uri;
      if (!uri) return undefined;
      return vscode.commands.executeCommand(
        "vscode.openWith",
        uri,
        DIAGRAM_VIEW_TYPE,
        vscode.ViewColumn.Beside,
      );
    }),
  ];
}

/**
 * The command only forwards its name to the focused diagram, which runs the same handler as its
 * menu entry. `runCommand` returns false when no diagram editor is focused.
 */
export function registerWebviewCommands(
  runCommand: (name: WebviewCommand) => boolean,
): vscode.Disposable[] {
  return (Object.keys(WEBVIEW_COMMANDS) as WebviewCommand[]).map((name) =>
    vscode.commands.registerCommand(WEBVIEW_COMMANDS[name], () => {
      if (!runCommand(name)) void vscode.window.showInformationMessage(NO_DIAGRAM_MESSAGE);
    }),
  );
}
