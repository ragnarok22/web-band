import { create } from "zustand";

import type { AudioEngineStatus } from "@/types/audio";

interface AudioStore {
  errorMessage: string | null;
  status: AudioEngineStatus;
  setError: (message: string) => void;
  setStatus: (status: AudioEngineStatus) => void;
}

export const useAudioStore = create<AudioStore>((set) => ({
  errorMessage: null,
  status: "not-initialized",
  setError: (errorMessage) => set({ errorMessage, status: "error" }),
  setStatus: (status) =>
    set((state) => ({
      errorMessage: status === "error" ? state.errorMessage : null,
      status,
    })),
}));
