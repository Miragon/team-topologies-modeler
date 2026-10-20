import type { WebviewStateApi } from "@miragon/modeler-shell/vscode/webview";

/** Where the webview kept the legend's open state before the modeler shell kept it. */
const LEGACY_LEGEND_KEY = "legendOpen";

function stateRecord(api: WebviewStateApi): Record<string, unknown> {
  const state = api.getState();
  return state !== null && typeof state === "object" && !Array.isArray(state)
    ? (state as Record<string, unknown>)
    : {};
}

/**
 * The legend state the webview stored before it moved onto the modeler shell, removed from the
 * webview state, so the user's choice carries over once and no stale key stays behind.
 */
export function takeLegacyLegendOpen(api: WebviewStateApi): boolean | undefined {
  const state = stateRecord(api);
  if (!(LEGACY_LEGEND_KEY in state)) return undefined;
  const { [LEGACY_LEGEND_KEY]: value, ...rest } = state;
  api.setState(rest);
  return typeof value === "boolean" ? value : undefined;
}
