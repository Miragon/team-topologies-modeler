/** UI-only state (panels/overlays) kept separate from the document store. */

import { create } from "zustand";

interface UiState {
  legendOpen: boolean;
  helpOpen: boolean;
  /** Once the user starts a diagram ("New file"), the welcome card stays gone for the session. */
  welcomeDismissed: boolean;
  toggleLegend: () => void;
  toggleHelp: () => void;
  setHelp: (open: boolean) => void;
  dismissWelcome: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  legendOpen: true,
  helpOpen: false,
  welcomeDismissed: false,
  toggleLegend: () => set((s) => ({ legendOpen: !s.legendOpen })),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
  dismissWelcome: () => set({ welcomeDismissed: true }),
}));
