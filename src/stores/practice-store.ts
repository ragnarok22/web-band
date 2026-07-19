import { create } from "zustand";

import {
  defaultPracticeSettings,
  getStartupPracticeSettings,
  loadPracticeSettings,
  savePracticeSettings,
} from "@/db/repositories/settings-repository";
import { clampBpm } from "@/lib/musical-time";
import { clampUnit, createDefaultMixerSettings } from "@/lib/mixer";
import { isPracticePresetConfiguration } from "@/lib/practice-validation";
import { reportPreferenceWrite } from "@/stores/storage-store";
import type {
  CountInMeasures,
  FillFrequency,
  MixerGroup,
  MixerSettings,
  SoundCharacter,
} from "@/types/audio";
import type {
  BpmAdjustmentStep,
  PracticePresetConfiguration,
  PracticeSettings,
} from "@/types/persistence";

interface PracticeStore extends PracticeSettings {
  applyConfiguration: (configuration: PracticePresetConfiguration) => void;
  hasHydrated: boolean;
  hydrate: () => void;
  resetBpm: (bpm: number) => void;
  resetMixer: () => void;
  replaceSettings: (settings: PracticeSettings) => boolean;
  setBpm: (bpm: number) => void;
  setBpmAdjustmentStep: (step: BpmAdjustmentStep) => void;
  setCountInMeasures: (measures: CountInMeasures) => void;
  setFillFrequency: (frequency: FillFrequency) => void;
  setHumanization: (amount: number) => void;
  setMasterVolume: (volume: number) => void;
  setMixerMuted: (group: MixerGroup, muted: boolean) => void;
  setMixerSolo: (group: MixerGroup, solo: boolean) => void;
  setMixerVolume: (group: MixerGroup, volume: number) => void;
  setSelectedPatternId: (patternId: string) => void;
  setRestoreLastPractice: (enabled: boolean) => void;
  setSoundCharacter: (soundCharacter: SoundCharacter) => void;
  setSwing: (amount: number) => void;
  setWakeLockEnabled: (enabled: boolean) => void;
}

function settingsFromState(state: PracticeStore): PracticeSettings {
  return {
    bpm: state.bpm,
    bpmAdjustmentStep: state.bpmAdjustmentStep,
    countInMeasures: state.countInMeasures,
    fillFrequency: state.fillFrequency,
    humanization: state.humanization,
    masterVolume: state.masterVolume,
    mixer: state.mixer,
    restoreLastPractice: state.restoreLastPractice,
    selectedPatternId: state.selectedPatternId,
    soundCharacter: state.soundCharacter,
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
    const persisted = savePracticeSettings({
      ...settingsFromState(get()),
      ...changes,
      ...(mixer ? { mixer } : {}),
    });
    reportPreferenceWrite("practice settings", persisted);
  }

  return {
    ...defaultPracticeSettings,
    applyConfiguration: (configuration) => {
      if (!isPracticePresetConfiguration(configuration)) {
        throw new Error("Practice preset configuration is invalid.");
      }
      update({
        bpm: configuration.bpm,
        countInMeasures: configuration.countInMeasures,
        fillFrequency: configuration.fillFrequency,
        humanization: configuration.humanization,
        selectedPatternId: configuration.patternId,
        swing: configuration.swing,
      });
    },
    hasHydrated: false,
    hydrate: () =>
      set({
        ...getStartupPracticeSettings(loadPracticeSettings()),
        hasHydrated: true,
      }),
    resetBpm: (bpm) => update({ bpm: clampBpm(bpm) }),
    resetMixer: () => update({}, createDefaultMixerSettings()),
    replaceSettings: (settings) => {
      const next = structuredClone(settings);
      set(next);
      const persisted = savePracticeSettings(next);
      reportPreferenceWrite("practice settings", persisted);
      return persisted;
    },
    setBpm: (bpm) => update({ bpm: clampBpm(bpm) }),
    setBpmAdjustmentStep: (bpmAdjustmentStep) => update({ bpmAdjustmentStep }),
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
    setRestoreLastPractice: (restoreLastPractice) =>
      update({ restoreLastPractice }),
    setSoundCharacter: (soundCharacter) => update({ soundCharacter }),
    setSwing: (swing) => update({ swing: Math.min(0.65, Math.max(0, swing)) }),
    setWakeLockEnabled: (wakeLockEnabled) => update({ wakeLockEnabled }),
  };
});
