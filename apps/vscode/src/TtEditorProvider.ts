import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml.js";
import { exportImageToFile } from "./exportImage.js";
import type { HostToWebview, WebviewToHost } from "./protocol.js";

/**
 * VS Code gives a save participant about 1.5 s before it skips it, and drops one that overruns
 * repeatedly; a webview that doesn't answer in time is saved without its draft instead.
 */
const FLUSH_TIMEOUT_MS = 1000;

/**
 * CustomTextEditor for `.tt` / `.ttm.json`. The document (native JSON) remains the source of truth —
 * VS Code handles dirty state, saving, Git, diff, and file undo "for free". The webview renders the
 * diagram (diagram-js modeler) and mirrors graphical changes back into the document via WorkspaceEdit.
 */
export class TtEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "teamTopologies.editor";

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      TtEditorProvider.viewType,
      new TtEditorProvider(context),
      {
        // Diagram editor: preserve state (zoom/selection) across tab switches.
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  private constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const webview = webviewPanel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist")],
    };
    webview.html = getWebviewHtml(webview, this.context.extensionUri);

    const post = (msg: HostToWebview): Thenable<boolean> => webview.postMessage(msg);

    // Texts the webview itself produced — to suppress the echo (an own change comes back as
    // onDidChangeTextDocument) and NOT reset the canvas. A SET (not a single value): for edits A,B
    // in quick succession, EVERY echo must be suppressed, regardless of the order in which the
    // change events arrive.
    const suppressEcho = new Set<string>();

    // Edits apply one after another, so a save that waits for the webview's flush also waits for
    // the edit that flush produced.
    let appliedEdits: Promise<void> = Promise.resolve();
    const pendingFlushes = new Map<number, () => void>();
    let nextFlushId = 1;

    const flushWebview = (): Promise<void> =>
      new Promise<void>((resolve) => {
        const id = nextFlushId++;
        const finish = (): void => {
          clearTimeout(timer);
          pendingFlushes.delete(id);
          resolve();
        };
        const timer = setTimeout(finish, FLUSH_TIMEOUT_MS);
        pendingFlushes.set(id, finish);
        post({ type: "flush", id }).then((delivered) => {
          if (!delivered) finish();
        }, finish);
      }).then(() => appliedEdits);

    // An inspector field commits on blur or Enter, and Ctrl/Cmd+S keeps the focus where it is. An
    // autosave after a delay is left alone: it would commit, and add an undo step, mid-typing.
    const saveSub = vscode.workspace.onWillSaveTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      if (e.reason === vscode.TextDocumentSaveReason.AfterDelay) return;
      e.waitUntil(flushWebview());
    });

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() !== document.uri.toString()) return;
      const text = document.getText();
      if (suppressEcho.has(text)) {
        suppressEcho.delete(text);
        return;
      }
      void post({ type: "update", text });
    });

    const messageSub = webview.onDidReceiveMessage(async (msg: WebviewToHost) => {
      switch (msg.type) {
        case "ready":
          await post({ type: "init", text: document.getText() });
          break;
        case "edit": {
          const applying = appliedEdits.then(() =>
            this.replaceWholeDocument(document, msg.text, suppressEcho),
          );
          appliedEdits = applying.catch(() => undefined);
          await applying;
          break;
        }
        case "flushed":
          pendingFlushes.get(msg.id)?.();
          break;
        case "export":
          await exportImageToFile(document.uri, msg.format, msg.data);
          break;
        case "info":
          void vscode.window.showInformationMessage(msg.message);
          break;
        case "error":
          void vscode.window.showErrorMessage(msg.message);
          break;
      }
    });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      messageSub.dispose();
      saveSub.dispose();
      for (const finish of [...pendingFlushes.values()]) finish();
    });
  }

  private async replaceWholeDocument(
    document: vscode.TextDocument,
    text: string,
    suppressEcho: Set<string>,
  ): Promise<void> {
    if (document.getText() === text) return;
    // Register first (synchronously, before applyEdit), so the resulting change event is reliably
    // recognized as an echo. Only add when a write actually happens (not a no-op above) -> no
    // orphaned set entries.
    suppressEcho.add(text);
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );
    edit.replace(document.uri, fullRange, text);
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) suppressEcho.delete(text); // write failed (e.g. read-only) -> no echo
  }
}
