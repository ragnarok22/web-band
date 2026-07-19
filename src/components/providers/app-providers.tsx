"use client";

import { useEffect, type ReactNode } from "react";

import { AppNotifications } from "@/components/providers/app-notifications";
import { storageService } from "@/db/storage-service";
import {
  applyAppearancePreferences,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { useStorageStore } from "@/stores/storage-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const hydrate = usePracticeStore((state) => state.hydrate);
  const hydrateHistorySettings = useHistorySettingsStore(
    (state) => state.hydrate,
  );
  const hydratePracticeHistory = usePracticeHistoryStore(
    (state) => state.hydrate,
  );
  const hydrateChordProgressions = useChordProgressionStore(
    (state) => state.hydrate,
  );
  const hydrateGuidedPractice = useGuidedPracticeStore(
    (state) => state.hydrate,
  );
  const hydratePatterns = usePatternStore((state) => state.hydrate);
  const hydratePracticePresets = usePracticePresetStore(
    (state) => state.hydrate,
  );
  const hydrateStrummingPatterns = useStrummingPatternStore(
    (state) => state.hydrate,
  );
  const setStorageStatus = useStorageStore((state) => state.setStorageStatus);
  const setCorruptRowCounts = useStorageStore(
    (state) => state.setCorruptRowCounts,
  );
  const hydrateAppearance = useAppearanceStore((state) => state.hydrate);

  useEffect(() => {
    const unsubscribeFromCorruptRows =
      storageService.subscribeToCorruptRows(setCorruptRowCounts);
    hydrateAppearance();
    hydrate();
    hydrateHistorySettings();

    let isActive = true;
    void storageService.initialize().then(async (status) => {
      if (!isActive) {
        return;
      }

      setStorageStatus(status.mode, status.warning);
      hydrateGuidedPractice();
      const hydrationResults = await Promise.allSettled([
        hydratePatterns(),
        hydrateChordProgressions(),
        hydratePracticePresets(),
        hydratePracticeHistory(),
        hydrateStrummingPatterns(),
      ]);
      if (
        isActive &&
        hydrationResults.some((result) => result.status === "rejected")
      ) {
        const recoveryStatus =
          await storageService.recoverFromIndexedDbFailure();
        setStorageStatus(recoveryStatus.mode, recoveryStatus.warning);
        await Promise.all([
          hydratePatterns(),
          hydrateChordProgressions(),
          hydratePracticePresets(),
          hydratePracticeHistory(),
          hydrateStrummingPatterns(),
        ]);
      }
    });

    return () => {
      isActive = false;
      unsubscribeFromCorruptRows();
    };
  }, [
    hydrate,
    hydrateAppearance,
    hydrateChordProgressions,
    hydrateGuidedPractice,
    hydrateHistorySettings,
    hydratePatterns,
    hydratePracticePresets,
    hydratePracticeHistory,
    hydrateStrummingPatterns,
    setCorruptRowCounts,
    setStorageStatus,
  ]);

  useEffect(() => {
    const colorScheme = window.matchMedia?.("(prefers-color-scheme: light)");
    const handleColorSchemeChange = () => {
      const { reducedMotion, theme } = useAppearanceStore.getState();
      if (theme === "system") {
        applyAppearancePreferences({ reducedMotion, theme });
      }
    };
    colorScheme?.addEventListener("change", handleColorSchemeChange);
    return () =>
      colorScheme?.removeEventListener("change", handleColorSchemeChange);
  }, []);

  return (
    <>
      {children}
      <AppNotifications />
    </>
  );
}
