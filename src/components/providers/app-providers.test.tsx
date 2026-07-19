import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/providers/app-providers";
import { basicRockPattern } from "@/data/patterns";
import { WebBandDatabase } from "@/db/database";
import { storageService } from "@/db/storage-service";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import {
  createDefaultGuidedPracticeValues,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";
import type { CustomDrumPattern } from "@/types/persistence";

let databaseName = "";

beforeEach(async () => {
  storageService.close();
  usePatternStore.setState({
    customPatterns: [],
    favoritePatternIds: [],
    isHydrated: false,
    recentPatternIds: [],
  });
  useChordProgressionStore.setState({
    customProgressions: [],
    favoriteProgressionIds: [],
    isHydrated: false,
  });
  useStrummingPatternStore.setState({
    customPatterns: [],
    isHydrated: false,
  });
  usePracticePresetStore.setState({
    isHydrated: false,
    presets: [],
    recentPresetIds: [],
  });
  usePracticeHistoryStore.setState({
    errorMessage: null,
    isHydrated: false,
    isLoading: false,
    sessions: [],
  });
  useHistorySettingsStore.setState({
    ...defaultHistorySettings,
    hasHydrated: false,
  });
  useStorageStore.setState({
    corruptRowCounts: {},
    isInitialized: false,
    mode: "memory",
    preferenceWriteFailures: [],
    warning: null,
  });
  usePracticeStore.setState({
    ...structuredClone(defaultPracticeSettings),
    hasHydrated: false,
  });
  useGuidedPracticeStore.setState({
    ...createDefaultGuidedPracticeValues(),
    isHydrated: false,
  });
  usePracticeStore.getState().setBpm(137);
  useGuidedPracticeStore.getState().setMode("tempoTrainer");
  databaseName = `web-band-test-${crypto.randomUUID()}`;
  await storageService.initialize(databaseName);
});

afterEach(() => {
  storageService.close();
  vi.restoreAllMocks();
});

describe("app providers", () => {
  it("recovers failed post-open hydration without losing active configuration", async () => {
    vi.spyOn(
      storageService.practicePresetRepository,
      "list",
    ).mockRejectedValueOnce(new Error("repository read failed"));

    render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(useStorageStore.getState().mode).toBe("memory");
      expect(usePatternStore.getState().isHydrated).toBe(true);
      expect(useChordProgressionStore.getState().isHydrated).toBe(true);
      expect(useStrummingPatternStore.getState().isHydrated).toBe(true);
      expect(usePracticePresetStore.getState().isHydrated).toBe(true);
      expect(usePracticeHistoryStore.getState().isHydrated).toBe(true);
    });
    expect(useStorageStore.getState().warning).toContain(
      "Practice can continue",
    );
    expect(usePracticeStore.getState().bpm).toBe(137);
    expect(useGuidedPracticeStore.getState().mode).toBe("tempoTrainer");
    expect(useHistorySettingsStore.getState().hasHydrated).toBe(true);
  });

  it("includes practice history in repository-failure recovery", async () => {
    vi.spyOn(
      storageService.practiceSessionRepository,
      "list",
    ).mockRejectedValueOnce(new Error("history read failed"));

    render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(useStorageStore.getState().mode).toBe("memory");
      expect(usePracticeHistoryStore.getState().isHydrated).toBe(true);
      expect(usePracticeHistoryStore.getState().errorMessage).toBeNull();
    });
    expect(useStorageStore.getState().warning).toContain(
      "Practice can continue",
    );
  });

  it("starts with session defaults when restoring the last setup is disabled", async () => {
    usePracticeStore.getState().setCountInMeasures(4);
    usePracticeStore.getState().setRestoreLastPractice(false);

    render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(useGuidedPracticeStore.getState().isHydrated).toBe(true);
    });
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: defaultPracticeSettings.bpm,
      countInMeasures: 4,
      restoreLastPractice: false,
    });
    expect(useGuidedPracticeStore.getState().mode).toBe("drums");
  });

  it("keeps IndexedDB active and warns when hydration filters corrupt rows", async () => {
    const database = new WebBandDatabase(databaseName);
    await database.open();
    await database.customPatterns.put({
      ...structuredClone(basicRockPattern),
      createdAt: "invalid",
      id: "corrupt-private-pattern",
      isBuiltIn: false,
      name: "Private row contents",
      updatedAt: "2026-07-18T12:00:00.000Z",
    } as CustomDrumPattern);
    database.close();

    render(
      <AppProviders>
        <div>Application</div>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(useStorageStore.getState()).toMatchObject({
        corruptRowCounts: { customPatterns: 1 },
        mode: "indexed-db",
        warning: null,
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Custom drum patterns: 1",
    );
    expect(screen.queryByText("Private row contents")).not.toBeInTheDocument();
  });
});
