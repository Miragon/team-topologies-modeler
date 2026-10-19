import * as vscode from "vscode";
import {
  DIAGRAM_VIEW_TYPE,
  PNG_VIEW_TYPE,
  registerSideBySideCommands,
  registerWebviewCommands,
} from "./commands.js";
import { DIAGNOSTIC_COLLECTION_NAME } from "./diagnostics.js";
import { DiagramPanels } from "./diagramPanels.js";
import { EMPTY_MAP, EXAMPLE_MAP } from "./examples.js";
import { TtEditorProvider } from "./TtEditorProvider.js";
import { TtPngEditorProvider } from "./TtPngEditorProvider.js";

export function activate(context: vscode.ExtensionContext): void {
  const panels = new DiagramPanels(context.extensionUri);
  const diagnostics = vscode.languages.createDiagnosticCollection(DIAGNOSTIC_COLLECTION_NAME);
  context.subscriptions.push(
    diagnostics,
    TtEditorProvider.register(panels, diagnostics),
    TtPngEditorProvider.register(panels, diagnostics),
    ...registerWebviewCommands((name) => panels.runCommand(name)),
    ...registerSideBySideCommands(() => panels.activeTextDocumentUri()),
    vscode.commands.registerCommand("teamTopologies.newDiagram", () => createMap(EMPTY_MAP)),
    vscode.commands.registerCommand("teamTopologies.newFromExample", () => createMap(EXAMPLE_MAP)),
    vscode.commands.registerCommand("teamTopologies.newPngDiagram", () => createPngMap()),
  );
}

export function deactivate(): void {
  /* nothing to do — all resources are tied to context.subscriptions */
}

/** A real file URI rather than an untitled doc is most robust for CustomTextEditor. */
async function createMap(initial: string): Promise<void> {
  const options: vscode.SaveDialogOptions = {
    title: "New Team Topologies Diagram",
    saveLabel: "Create diagram",
    filters: { "Team Topologies": ["tt", "ttm.json"] },
  };
  const defaultUri = defaultMapUri();
  if (defaultUri) options.defaultUri = defaultUri;

  const target = await vscode.window.showSaveDialog(options);
  if (!target) return;

  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(initial));
  await vscode.commands.executeCommand("vscode.openWith", target, DIAGRAM_VIEW_TYPE);
}

function defaultMapUri(): vscode.Uri | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? vscode.Uri.joinPath(folder.uri, "team-topology.tt") : undefined;
}

/**
 * Creates a new, embedded PNG diagram (`*.tt.png`) and opens it in the PNG editor. The file starts
 * as a 0-byte placeholder (rendering only works in the webview) and is immediately "dirty": a Cmd+S
 * materializes the rendered PNG with the embedded document.
 */
async function createPngMap(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  const options: vscode.SaveDialogOptions = {
    title: "New Team Topologies Diagram (embedded PNG)",
    saveLabel: "Create diagram",
    filters: { "Team Topologies (PNG)": ["png"] },
  };
  if (folder) options.defaultUri = vscode.Uri.joinPath(folder.uri, "team-topology.tt.png");

  const chosen = await vscode.window.showSaveDialog(options);
  if (!chosen) return;

  // Ensure the editor will actually claim the file (it only binds *.tt.png/*.ttm.png).
  const target = /\.(tt|ttm)\.png$/i.test(chosen.path)
    ? chosen
    : chosen.with({ path: `${chosen.path.replace(/\.png$/i, "")}.tt.png` });

  await vscode.workspace.fs.writeFile(target, new Uint8Array());
  await vscode.commands.executeCommand("vscode.openWith", target, PNG_VIEW_TYPE);
}
