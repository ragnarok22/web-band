import { create } from "zustand";

import {
  defaultHistorySettings,
  loadHistorySettings,
  saveHistorySettings,
} from "@/db/repositories/history-settings-repository";
import { clampHistoryMinimumDurationSeconds } from "@/lib/history-settings";
import { reportPreferenceWrite } from "@/stores/storage-store";
import type { HistorySettings } from "@/types/persistence";

interface HistorySettingsStore extends HistorySettings {
  hasHydrated: boolean;
  hydrate: () => void;
  replaceSettings: (settings: HistorySettings) => boolean;
  setEnabled: (enabled: boolean) => void;
  setMinimumDurationSeconds: (seconds: number) => void;
}

export const useHistorySettingsStore = create<HistorySettingsStore>(
  (set, get) => {
    function update(changes: Partial<HistorySettings>): void {
      set(changes);
      const persisted = saveHistorySettings({
        enabled: get().enabled,
        minimumDurationSeconds: get().minimumDurationSeconds,
      });
      reportPreferenceWrite("history settings", persisted);
    }

    return {
      ...defaultHistorySettings,
      hasHydrated: false,
      hydrate: () => set({ ...loadHistorySettings(), hasHydrated: true }),
      replaceSettings: (settings) => {
        const next = {
          enabled: settings.enabled,
          minimumDurationSeconds: clampHistoryMinimumDurationSeconds(
            settings.minimumDurationSeconds,
          ),
        };
        set(next);
        const persisted = saveHistorySettings(next);
        reportPreferenceWrite("history settings", persisted);
        return persisted;
      },
      setEnabled: (enabled) => update({ enabled }),
      setMinimumDurationSeconds: (seconds) =>
        update({
          minimumDurationSeconds: clampHistoryMinimumDurationSeconds(seconds),
        }),
    };
  },
);
