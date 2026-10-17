/**
 * Whether the legend is shown, shared by the menu checkbox and the legend's own close button.
 * The webview state keeps the user's last choice, so it survives the webview being hidden, moved
 * or restored after a reload. Until the user chooses, the pane size decides.
 */

export interface WebviewStateStore {
  getState(): unknown;
  setState(state: unknown): void;
}

export interface LegendState {
  isOpen(): boolean;
  setOpen(open: boolean): void;
  /** Returns the unsubscribe function, as `useSyncExternalStore` expects. */
  subscribe(listener: () => void): () => void;
}

const STATE_KEY = "legendOpen";

function storedState(store: WebviewStateStore): Record<string, unknown> {
  const state = store.getState();
  return typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
}

export function createLegendState(
  store: WebviewStateStore,
  openByDefault: () => boolean,
): LegendState {
  const stored = storedState(store)[STATE_KEY];
  let open = typeof stored === "boolean" ? stored : openByDefault();
  const listeners = new Set<() => void>();

  return {
    isOpen: () => open,
    setOpen(next) {
      if (next === open) return;
      open = next;
      store.setState({ ...storedState(store), [STATE_KEY]: open });
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
