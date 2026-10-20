import {
  installVsCodeWebviewStub,
  stubOptionsFromSearch,
} from "@miragon/modeler-shell/testing/vscode-stub";
import { EMPTY_MAP, EXAMPLE_MAP } from "../../apps/vscode/src/examples.js";
import { WEBVIEW_THEMES } from "../../apps/vscode/src/themes.js";

const search = new URLSearchParams(location.search);

// A state the webview stored before (e.g. the legend state of an older version), as VS Code's
// getState() would return it after a window reload.
const storedState = search.get("state");

// The stub stands in for VS Code (default styles, <html> as renderWebviewHtml writes it, body
// theme classes, acquireVsCodeApi, theme bridge) and must be in place before the webview runs.
installVsCodeWebviewStub({
  ...stubOptionsFromSearch(location.search),
  themes: WEBVIEW_THEMES,
  ...(storedState ? { state: JSON.parse(storedState) as unknown } : {}),
});
const { webview } = await import("../../apps/vscode/src/webview/main.js");

// The tests drive the webview through these; the shipped bundle publishes nothing on window.
window.shell = webview.shell;
window.modeler = webview.modeler;
window.connection = webview.connection;
void webview.ready.then(() => {
  window.webviewReady = true;
});

const DOCUMENTS: Record<string, string> = { empty: EMPTY_MAP, example: EXAMPLE_MAP, blank: "" };
const text = DOCUMENTS[search.get("doc") ?? "example"] ?? EXAMPLE_MAP;
window.postMessage({ type: "init", text }, "*");
