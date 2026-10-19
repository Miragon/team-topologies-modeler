import * as vscode from "vscode";
import { DIAGRAM_VIEW_TYPE } from "./commands.js";
import { documentDiagnostics, problemCounts } from "./diagnostics.js";
import type { DiagramPanels } from "./diagramPanels.js";
import { withExampleInserted } from "./examples.js";
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
 * diagram (the diagram-js modeler inside the shared modeler shell) and mirrors graphical changes
 * back into the document via WorkspaceEdit. The document's problems go to the Problems view.
 */
export class TtEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = DIAGRAM_VIEW_TYPE;

  public static register(
    panels: DiagramPanels,
    diagnostics: vscode.DiagnosticCollection,
  ): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(
      TtEditorProvider.viewType,
      new TtEditorProvider(panels, diagnostics),
      {
        // A hidden tab keeps document, view and selection (and reports 0 × 0 meanwhile).
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  private constructor(
    private readonly panels: DiagramPanels,
    private readonly diagnostics: vscode.DiagnosticCollection,
  ) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const webview = webviewPanel.webview;
    this.panels.show(webviewPanel, document.uri, { text: true });

    const post = (msg: HostToWebview): Thenable<boolean> => webview.postMessage(msg);

    // The pill shows what the Problems view shows; posted once the webview is ready, then on
    // every change of the summary.
    let postedProblems: string | undefined;
    const refreshDiagnostics = (): void => {
      const diagnostics = documentDiagnostics(document.getText(), document);
      this.diagnostics.set(document.uri, diagnostics);
      const counts = problemCounts(diagnostics);
      const summary = JSON.stringify(counts);
      if (postedProblems === undefined || postedProblems === summary) return;
      postedProblems = summary;
      void post({ type: "problems", ...counts });
    };
    refreshDiagnostics();

    // Texts the webview itself produced — to suppress the echo (an own change comes back as
    // onDidChangeTextDocument) and NOT reset the canvas. A SET (not a single value): for edits A,B
    // in quick succession, EVERY echo must be suppressed, regardless of the order in which the
    // change events arrive.
    const suppressEcho = new Set<string>();

    // Edits apply one after another, so a save that waits for the webview's flush also waits for
    // the edit that flush produced.
    let appliedEdits: Promise<void> = Promise.resolve();
    const applyInOrder = (text: string, { echo }: { echo: boolean }): Promise<void> => {
      const applying = appliedEdits.then(() =>
        this.replaceWholeDocument(document, text, echo ? undefined : suppressEcho),
      );
      appliedEdits = applying.catch(() => undefined);
      return applying;
    };
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
      // A save or a dirty-state change fires without a content change: nothing to sync.
      if (e.contentChanges.length === 0) return;
      // Echoes too: an edit on the canvas can add or remove a finding.
      refreshDiagnostics();
      const text = document.getText();
      if (suppressEcho.has(text)) {
        suppressEcho.delete(text);
        return;
      }
      void post({ type: "update", text });
    });

    const messageSub = webview.onDidReceiveMessage(async (msg: WebviewToHost) => {
      switch (msg.type) {
        case "ready": {
          await post({ type: "init", text: document.getText() });
          const counts = problemCounts(this.diagnostics.get(document.uri) ?? []);
          postedProblems = JSON.stringify(counts);
          await post({ type: "problems", ...counts });
          break;
        }
        case "edit":
          await applyInOrder(msg.text, { echo: false });
          break;
        case "insertExample": {
          // Not echo-suppressed: the webview imports the example like any outside change.
          const text = withExampleInserted(document.getText());
          if (text === undefined) {
            void vscode.window.showErrorMessage(
              "Couldn't insert the example: fix the problems of this file first.",
            );
            break;
          }
          await applyInOrder(text, { echo: true });
          break;
        }
        case "flushed":
          pendingFlushes.get(msg.id)?.();
          break;
        case "export":
          await exportImageToFile(document.uri, msg.format, msg.data);
          break;
        case "showProblems":
          void vscode.commands.executeCommand("workbench.actions.view.problems");
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
      this.diagnostics.delete(document.uri);
      for (const finish of [...pendingFlushes.values()]) finish();
    });
  }

  /**
   * Replaces the document's text as one edit, one undo step. With `suppressEcho` the change it
   * causes is not sent back to the webview, which already shows it.
   */
  private async replaceWholeDocument(
    document: vscode.TextDocument,
    text: string,
    suppressEcho: Set<string> | undefined,
  ): Promise<void> {
    if (document.getText() === text) return;
    // Register first (synchronously, before applyEdit), so the resulting change event is reliably
    // recognized as an echo. Only add when a write actually happens (not a no-op above) -> no
    // orphaned set entries.
    suppressEcho?.add(text);
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );
    edit.replace(document.uri, fullRange, text);
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) suppressEcho?.delete(text); // write failed (e.g. read-only) -> no echo
  }
}
