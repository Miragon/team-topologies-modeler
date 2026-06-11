import * as vscode from "vscode";

/**
 * Image export (SVG/PNG) to disk via a save dialog — the scene (native JSON document) is embedded in
 * the file, so exported images can later be reopened as a diagram. Shared by the text and PNG editor
 * (hence generic over the source URI rather than a document type).
 */
export async function exportImageToFile(
  sourceUri: vscode.Uri | undefined,
  format: "svg" | "png",
  data: string,
): Promise<void> {
  const options: vscode.SaveDialogOptions = {
    filters: format === "svg" ? { "SVG image": ["svg"] } : { "PNG image": ["png"] },
  };
  const defaultUri = exportDefaultUri(sourceUri, format);
  if (defaultUri) options.defaultUri = defaultUri;
  const target = await vscode.window.showSaveDialog(options);
  if (!target) return;

  const bytes =
    format === "svg" ? new TextEncoder().encode(data) : new Uint8Array(Buffer.from(data, "base64"));
  await vscode.workspace.fs.writeFile(target, bytes);

  const action = await vscode.window.showInformationMessage(
    `Team Topologies diagram exported as ${format.toUpperCase()}.`,
    "Reveal",
  );
  if (action === "Reveal") void vscode.commands.executeCommand("revealFileInOS", target);
}

/** `<name>.<format>` next to the source file (if no file: in the first workspace folder). */
function exportDefaultUri(
  sourceUri: vscode.Uri | undefined,
  format: "svg" | "png",
): vscode.Uri | undefined {
  if (sourceUri && sourceUri.scheme === "file") {
    // Strip double extensions like `.tt.png` / `.ttm.json` too, so `topology.tt.png` -> `topology.svg`.
    const path = sourceUri.path.replace(/(\.(tt|ttm))?\.[^./]+$/i, "");
    return sourceUri.with({ path: `${path}.${format}` });
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? vscode.Uri.joinPath(folder.uri, `team-topology.${format}`) : undefined;
}
