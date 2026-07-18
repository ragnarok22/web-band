"use client";

import { useEffect, type ReactNode } from "react";

import { storageService } from "@/db/storage-service";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { usePatternStore } from "@/stores/pattern-store";
import { useStorageStore } from "@/stores/storage-store";

import { ServiceWorkerUpdate } from "./service-worker-update";
import { StorageWarning } from "./storage-warning";

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
  const setStorageStatus = useStorageStore((state) => state.setStorageStatus);

  useEffect(() => {
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
        ]);
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    hydrate,
    hydrateChordProgressions,
    hydrateGuidedPractice,
    hydrateHistorySettings,
    hydratePatterns,
    hydratePracticePresets,
    hydratePracticeHistory,
    setStorageStatus,
  ]);

  return (
    <>
      {children}
      <StorageWarning />
      <ServiceWorkerUpdate />
    </>
  );
}
