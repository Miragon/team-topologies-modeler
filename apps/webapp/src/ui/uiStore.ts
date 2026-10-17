/** UI-only state (panels/overlays) kept separate from the document store. */

import { create } from "zustand";
import { legendCrowdsCanvas } from "@miragon/team-topologies-ui";

/** Panels that close by unmounting hand keyboard focus back to the menu that reopens them. */
export function focusMenuTrigger(): void {
  document.querySelector<HTMLElement>(".tt-menu__trigger")?.focus();
}

/**
 * "pending" until the initial document is resolved, so the working chrome never flashes before the
 * welcome card. The card shows only on a fresh start and, once dismissed, never returns in this
 * session (guide §8: "solange der Canvas leer und unberührt ist").
 */
export type WelcomeState = "pending" | "visible" | "dismissed";

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  /** "destructive" when confirming loses or replaces work, "primary" when nothing is lost. */
  tone: "destructive" | "primary";
}

interface PendingConfirm extends ConfirmRequest {
  /** A follow-up question gets its own dialog, with fresh initial focus. */
  id: number;
  resolve: (confirmed: boolean) => void;
}

let confirmCounter = 0;

interface UiState {
  legendOpen: boolean;
  helpOpen: boolean;
  welcome: WelcomeState;
  /** A previous diagram is kept in storage and can be restored from the menu. */
  backupAvailable: boolean;
  confirm: PendingConfirm | null;
  setLegend: (open: boolean) => void;
  toggleHelp: () => void;
  setHelp: (open: boolean) => void;
  resolveWelcome: (visible: boolean) => void;
  dismissWelcome: () => void;
  setBackupAvailable: (available: boolean) => void;
  requestConfirm: (request: ConfirmRequest) => Promise<boolean>;
  settleConfirm: (confirmed: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  // Where the legend would cover the diagram, it starts closed; the menu opens it.
  legendOpen: !legendCrowdsCanvas(),
  helpOpen: false,
  welcome: "pending",
  backupAvailable: false,
  confirm: null,
  setLegend: (open) => set({ legendOpen: open }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
  resolveWelcome: (visible) =>
    set((s) => (s.welcome === "pending" ? { welcome: visible ? "visible" : "dismissed" } : s)),
  dismissWelcome: () => set((s) => (s.welcome === "dismissed" ? s : { welcome: "dismissed" })),
  setBackupAvailable: (available) => set({ backupAvailable: available }),
  requestConfirm: (request) =>
    new Promise<boolean>((resolve) => {
      get().confirm?.resolve(false);
      set({ confirm: { ...request, id: ++confirmCounter, resolve } });
    }),
  settleConfirm: (confirmed) => {
    const pending = get().confirm;
    if (!pending) return;
    set({ confirm: null });
    pending.resolve(confirmed);
  },
}));

/** True while a dialog owns the keyboard, so global shortcuts and file drops stay out of its way. */
export function isDialogOpen(): boolean {
  const state = useUiStore.getState();
  return state.helpOpen || state.confirm !== null;
}
