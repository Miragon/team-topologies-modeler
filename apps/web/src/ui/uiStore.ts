/** UI-only state (panels/overlays) kept separate from the document store. */

import { create } from "zustand";

interface UiState {
  legendOpen: boolean;
  helpOpen: boolean;
  toggleLegend: () => void;
  toggleHelp: () => void;
  setHelp: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  legendOpen: true,
  helpOpen: false,
  toggleLegend: () => set((s) => ({ legendOpen: !s.legendOpen })),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  setHelp: (open) => set({ helpOpen: open }),
}));
