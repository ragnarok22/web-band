import { create } from "zustand";

interface PracticeUiStore {
  isFocusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
}

export const usePracticeUiStore = create<PracticeUiStore>((set) => ({
  isFocusMode: false,
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
}));
