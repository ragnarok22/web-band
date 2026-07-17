import { create } from "zustand";

import {
  defaultPracticeSettings,
  loadPracticeSettings,
  savePracticeSettings,
} from "@/db/repositories/settings-repository";
import { clampBpm } from "@/lib/musical-time";

interface PracticeStore {
  bpm: number;
  countInMeasures: 1;
  hasHydrated: boolean;
  masterVolume: number;
  selectedPatternId: string;
  hydrate: () => void;
  resetBpm: (bpm: number) => void;
  setBpm: (bpm: number) => void;
  setMasterVolume: (volume: number) => void;
  setSelectedPatternId: (patternId: string) => void;
}

function persistSettings(
  bpm: number,
  masterVolume: number,
  selectedPatternId: string,
): void {
  savePracticeSettings({ bpm, masterVolume, selectedPatternId });
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  ...defaultPracticeSettings,
  countInMeasures: 1,
  hasHydrated: false,
  hydrate: () => {
    const settings = loadPracticeSettings();
    set({ ...settings, hasHydrated: true });
  },
  resetBpm: (bpm) => {
    const nextBpm = clampBpm(bpm);
    const state = get();
    set({ bpm: nextBpm });
    persistSettings(nextBpm, state.masterVolume, state.selectedPatternId);
  },
  setBpm: (bpm) => {
    const nextBpm = clampBpm(bpm);
    const state = get();
    set({ bpm: nextBpm });
    persistSettings(nextBpm, state.masterVolume, state.selectedPatternId);
  },
  setMasterVolume: (volume) => {
    const nextVolume = Math.min(1, Math.max(0, volume));
    const state = get();
    set({ masterVolume: nextVolume });
    persistSettings(state.bpm, nextVolume, state.selectedPatternId);
  },
  setSelectedPatternId: (selectedPatternId) => {
    const state = get();
    set({ selectedPatternId });
    persistSettings(state.bpm, state.masterVolume, selectedPatternId);
  },
}));
