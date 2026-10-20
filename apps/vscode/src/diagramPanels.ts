import * as vscode from "vscode";
import {
  connectThemeBridge,
  currentAppearance,
  renderWebviewHtml,
} from "@miragon/modeler-shell/vscode/extension";
import type { HostToWebview, WebviewCommand } from "./protocol.js";
import { WEBVIEW_THEMES } from "./themes.js";

interface TrackedPanel {
  readonly panel: vscode.WebviewPanel;
  readonly uri: vscode.Uri;
  /** A text document: it has a source to open beside the diagram. */
  readonly text: boolean;
}

/**
 * The diagram webviews of both editors (text and PNG): the HTML, CSP and theme bridge of the
 * modeler shell for each, and the focused one, so Command Palette commands reach it.
 */
export class DiagramPanels {
  private active: TrackedPanel | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  /** Renders the webview into `panel` and follows it until it closes. */
  show(panel: vscode.WebviewPanel, uri: vscode.Uri, { text }: { text: boolean }): void {
    const webview = panel.webview;
    const dist = vscode.Uri.joinPath(this.extensionUri, "dist");
    webview.options = { enableScripts: true, localResourceRoots: [dist] };
    const asset = (file: string): string =>
      webview.asWebviewUri(vscode.Uri.joinPath(dist, file)).toString();
    webview.html = renderWebviewHtml({
      cspSource: webview.cspSource,
      scriptUri: asset("webview.js"),
      styleUris: [asset("webview.css")],
      title: "Team Topologies Diagram",
      lang: "en",
      appearance: currentAppearance(vscode, { themes: WEBVIEW_THEMES }),
      body: '<div id="app"></div>',
    });
    // Disposes itself with the panel; never kept in context.subscriptions.
    connectThemeBridge(vscode, panel, { themes: WEBVIEW_THEMES });

    const tracked: TrackedPanel = { panel, uri, text };
    if (panel.active) this.active = tracked;
    const viewState = panel.onDidChangeViewState(() => {
      if (panel.active) this.active = tracked;
      else if (this.active === tracked) this.active = undefined;
    });
    panel.onDidDispose(() => {
      viewState.dispose();
      if (this.active === tracked) this.active = undefined;
    });
  }

  /** Forwards a Command Palette command to the focused diagram; false when none is focused. */
  runCommand(name: WebviewCommand): boolean {
    if (!this.active) return false;
    void this.active.panel.webview.postMessage({ type: "command", name } satisfies HostToWebview);
    return true;
  }

  /** The text document of the focused diagram, if it has one. */
  activeTextDocumentUri(): vscode.Uri | undefined {
    return this.active?.text ? this.active.uri : undefined;
  }
}
