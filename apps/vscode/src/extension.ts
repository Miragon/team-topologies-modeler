import * as vscode from "vscode";
import { serializeDocument, SAMPLE_DOCUMENT, DOCUMENT_VERSION } from "@tt-modeler/schema-model";
import type { TtDocument } from "@tt-modeler/schema-model";
import { TtEditorProvider } from "./TtEditorProvider.js";
import { TtPngEditorProvider } from "./TtPngEditorProvider.js";

const EMPTY_DOCUMENT: TtDocument = {
  version: DOCUMENT_VERSION,
  title: "New team topology",
  nodes: [],
  interactions: [],
  flows: [],
};

const EMPTY_MAP = serializeDocument(EMPTY_DOCUMENT, true) + "\n";

/** The bundled example diagram (identical to the demo webapp), as a starting point. */
const EXAMPLE_MAP = serializeDocument(SAMPLE_DOCUMENT, true) + "\n";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    TtEditorProvider.register(context),
    TtPngEditorProvider.register(context),
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
  await vscode.commands.executeCommand("vscode.openWith", target, TtEditorProvider.viewType);
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
  await vscode.commands.executeCommand("vscode.openWith", target, TtPngEditorProvider.viewType);
}
