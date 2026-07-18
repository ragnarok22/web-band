import { create } from "zustand";

import {
  defaultHistorySettings,
  loadHistorySettings,
  saveHistorySettings,
} from "@/db/repositories/history-settings-repository";
import type { HistorySettings } from "@/types/persistence";

interface HistorySettingsStore extends HistorySettings {
  hasHydrated: boolean;
  hydrate: () => void;
  replaceSettings: (settings: HistorySettings) => boolean;
  setEnabled: (enabled: boolean) => void;
  setMinimumDurationSeconds: (seconds: number) => void;
}

function clampMinimumDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return defaultHistorySettings.minimumDurationSeconds;
  }
  return Math.min(3_600, Math.max(0, Math.round(seconds)));
}

export const useHistorySettingsStore = create<HistorySettingsStore>(
  (set, get) => {
    function update(changes: Partial<HistorySettings>): void {
      set(changes);
      saveHistorySettings({
        enabled: get().enabled,
        minimumDurationSeconds: get().minimumDurationSeconds,
      });
    }

    return {
      ...defaultHistorySettings,
      hasHydrated: false,
      hydrate: () => set({ ...loadHistorySettings(), hasHydrated: true }),
      replaceSettings: (settings) => {
        const next = structuredClone(settings);
        set(next);
        return saveHistorySettings(next);
      },
      setEnabled: (enabled) => update({ enabled }),
      setMinimumDurationSeconds: (seconds) =>
        update({ minimumDurationSeconds: clampMinimumDuration(seconds) }),
    };
  },
);
