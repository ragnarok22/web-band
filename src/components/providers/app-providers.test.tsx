import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/components/providers/app-providers";
import { storageService } from "@/db/storage-service";
import { useChordProgressionStore } from "@/stores/chord-progression-store";
import { useGuidedPracticeStore } from "@/stores/guided-practice-store";
import { defaultHistorySettings } from "@/db/repositories/history-settings-repository";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { usePatternStore } from "@/stores/pattern-store";
import { usePracticeHistoryStore } from "@/stores/practice-history-store";
import { usePracticePresetStore } from "@/stores/practice-preset-store";
import { usePracticeStore } from "@/stores/practice-store";
import { useStorageStore } from "@/stores/storage-store";
import { useStrummingPatternStore } from "@/stores/strumming-pattern-store";

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
    isInitialized: false,
    mode: "memory",
    warning: null,
  });
  usePracticeStore.getState().setBpm(137);
  useGuidedPracticeStore.getState().setMode("tempoTrainer");
  await storageService.initialize(`web-band-test-${crypto.randomUUID()}`);
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
});
