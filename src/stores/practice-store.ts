import { create } from "zustand";

import {
  defaultPracticeSettings,
  loadPracticeSettings,
  savePracticeSettings,
} from "@/db/repositories/settings-repository";
import { clampBpm } from "@/lib/musical-time";
import { clampUnit, createDefaultMixerSettings } from "@/lib/mixer";
import type {
  CountInMeasures,
  FillFrequency,
  MixerGroup,
  MixerSettings,
} from "@/types/audio";
import type { PracticeSettings } from "@/types/persistence";

interface PracticeStore extends PracticeSettings {
  hasHydrated: boolean;
  hydrate: () => void;
  resetBpm: (bpm: number) => void;
  resetMixer: () => void;
  setBpm: (bpm: number) => void;
  setCountInMeasures: (measures: CountInMeasures) => void;
  setFillFrequency: (frequency: FillFrequency) => void;
  setHumanization: (amount: number) => void;
  setMasterVolume: (volume: number) => void;
  setMixerMuted: (group: MixerGroup, muted: boolean) => void;
  setMixerSolo: (group: MixerGroup, solo: boolean) => void;
  setMixerVolume: (group: MixerGroup, volume: number) => void;
  setSelectedPatternId: (patternId: string) => void;
  setSwing: (amount: number) => void;
  setWakeLockEnabled: (enabled: boolean) => void;
}

function settingsFromState(state: PracticeStore): PracticeSettings {
  return {
    bpm: state.bpm,
    countInMeasures: state.countInMeasures,
    fillFrequency: state.fillFrequency,
    humanization: state.humanization,
    masterVolume: state.masterVolume,
    mixer: state.mixer,
    selectedPatternId: state.selectedPatternId,
    swing: state.swing,
    wakeLockEnabled: state.wakeLockEnabled,
  };
}

export const usePracticeStore = create<PracticeStore>((set, get) => {
  function update(
    changes: Partial<PracticeSettings>,
    mixer?: MixerSettings,
  ): void {
    set({ ...changes, ...(mixer ? { mixer } : {}) });
    savePracticeSettings({
      ...settingsFromState(get()),
      ...changes,
      ...(mixer ? { mixer } : {}),
    });
  }

  return {
    ...defaultPracticeSettings,
    hasHydrated: false,
    hydrate: () => set({ ...loadPracticeSettings(), hasHydrated: true }),
    resetBpm: (bpm) => update({ bpm: clampBpm(bpm) }),
    resetMixer: () => update({}, createDefaultMixerSettings()),
    setBpm: (bpm) => update({ bpm: clampBpm(bpm) }),
    setCountInMeasures: (countInMeasures) => update({ countInMeasures }),
    setFillFrequency: (fillFrequency) => update({ fillFrequency }),
    setHumanization: (humanization) =>
      update({ humanization: clampUnit(humanization) }),
    setMasterVolume: (masterVolume) =>
      update({ masterVolume: clampUnit(masterVolume) }),
    setMixerMuted: (group, muted) => {
      const mixer = structuredClone(get().mixer);
      mixer[group].muted = muted;
      update({}, mixer);
    },
    setMixerSolo: (group, solo) => {
      const mixer = structuredClone(get().mixer);
      mixer[group].solo = solo;
      update({}, mixer);
    },
    setMixerVolume: (group, volume) => {
      const mixer = structuredClone(get().mixer);
      mixer[group].volume = clampUnit(volume);
      update({}, mixer);
    },
    setSelectedPatternId: (selectedPatternId) => update({ selectedPatternId }),
    setSwing: (swing) => update({ swing: Math.min(0.65, Math.max(0, swing)) }),
    setWakeLockEnabled: (wakeLockEnabled) => update({ wakeLockEnabled }),
  };
});
