import type { Theme } from "@miragon/modeler-shell/core";

/**
 * Team Topologies has no dark canvas yet, so the webview stays light in every VS Code theme (high
 * contrast still passes) until the Miragon modelers ship dark mode together (guide §13.5).
 */
export const WEBVIEW_THEMES: readonly Theme[] = ["light"];
