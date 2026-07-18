import { create } from "zustand";

interface PracticeUiStore {
  isFocusMode: boolean;
  openModalCount: number;
  closeModal: () => void;
  openModal: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
}

export const usePracticeUiStore = create<PracticeUiStore>((set) => ({
  closeModal: () =>
    set((state) => ({ openModalCount: Math.max(0, state.openModalCount - 1) })),
  isFocusMode: false,
  openModal: () =>
    set((state) => ({ openModalCount: state.openModalCount + 1 })),
  openModalCount: 0,
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
}));
