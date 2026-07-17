import { create } from "zustand";

import type { PersistenceMode } from "@/types/persistence";

interface StorageStore {
  isInitialized: boolean;
  mode: PersistenceMode;
  warning: string | null;
  setStorageStatus: (mode: PersistenceMode, warning: string | null) => void;
}

export const useStorageStore = create<StorageStore>((set) => ({
  isInitialized: false,
  mode: "memory",
  warning: null,
  setStorageStatus: (mode, warning) =>
    set({ isInitialized: true, mode, warning }),
}));
