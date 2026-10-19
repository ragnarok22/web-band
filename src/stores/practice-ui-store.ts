import { create } from "zustand";

import {
  loadControlsOpen,
  saveControlsOpen,
} from "@/db/repositories/practice-layout-repository";
import { reportPreferenceWrite } from "@/stores/storage-store";

interface PracticeUiStore {
  controlsOpen: boolean;
  hydrateLayout: () => void;
  setControlsOpen: (open: boolean) => boolean;
  isFocusMode: boolean;
  openModalCount: number;
  closeModal: () => void;
  openModal: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
}

export const usePracticeUiStore = create<PracticeUiStore>((set) => ({
  controlsOpen: false,
  hydrateLayout: () => set({ controlsOpen: loadControlsOpen() }),
  setControlsOpen: (controlsOpen) => {
    set({ controlsOpen });
    const persisted = saveControlsOpen(controlsOpen);
    reportPreferenceWrite("practice layout", persisted);
    return persisted;
  },
  closeModal: () =>
    set((state) => ({ openModalCount: Math.max(0, state.openModalCount - 1) })),
  isFocusMode: false,
  openModal: () =>
    set((state) => ({ openModalCount: state.openModalCount + 1 })),
  openModalCount: 0,
  setFocusMode: (isFocusMode) => set({ isFocusMode }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
}));
