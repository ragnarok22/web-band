import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  defaultHistorySettings,
  HISTORY_SETTINGS_KEY,
} from "@/db/repositories/history-settings-repository";
import { useHistorySettingsStore } from "@/stores/history-settings-store";
import { useStorageStore } from "@/stores/storage-store";

describe("history settings store", () => {
  beforeEach(() => {
    useHistorySettingsStore.setState({
      ...defaultHistorySettings,
      hasHydrated: false,
    });
    useStorageStore.setState({ preferenceWriteFailures: [] });
  });

  it("hydrates strict saved settings", () => {
    window.localStorage.setItem(
      HISTORY_SETTINGS_KEY,
      JSON.stringify({
        settings: { enabled: false, minimumDurationSeconds: 45 },
        version: 1,
      }),
    );

    useHistorySettingsStore.getState().hydrate();

    expect(useHistorySettingsStore.getState()).toMatchObject({
      enabled: false,
      hasHydrated: true,
      minimumDurationSeconds: 45,
    });
  });

  it("persists enabled and clamps minimum duration to an integer", () => {
    useHistorySettingsStore.getState().setEnabled(false);
    useHistorySettingsStore.getState().setMinimumDurationSeconds(91.8);
    expect(useHistorySettingsStore.getState()).toMatchObject({
      enabled: false,
      minimumDurationSeconds: 92,
    });

    useHistorySettingsStore.getState().setMinimumDurationSeconds(-10);
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(1);
    useHistorySettingsStore.getState().setMinimumDurationSeconds(Number.NaN);
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(30);
    useHistorySettingsStore.getState().setMinimumDurationSeconds(9_000);
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(
      3_600,
    );

    expect(
      JSON.parse(window.localStorage.getItem(HISTORY_SETTINGS_KEY)!),
    ).toEqual({
      settings: { enabled: false, minimumDurationSeconds: 3_600 },
      version: 1,
    });
  });

  it("replaces complete imported settings through one store API", () => {
    expect(
      useHistorySettingsStore.getState().replaceSettings({
        enabled: false,
        minimumDurationSeconds: 75,
      }),
    ).toBe(true);
    expect(useHistorySettingsStore.getState()).toMatchObject({
      enabled: false,
      minimumDurationSeconds: 75,
    });
    expect(
      JSON.parse(window.localStorage.getItem(HISTORY_SETTINGS_KEY)!),
    ).toEqual({
      settings: { enabled: false, minimumDurationSeconds: 75 },
      version: 1,
    });

    expect(
      useHistorySettingsStore.getState().replaceSettings({
        enabled: true,
        minimumDurationSeconds: 0,
      }),
    ).toBe(true);
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(1);
  });

  it("reports a failed normal preference write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    useHistorySettingsStore.getState().setEnabled(false);

    expect(useHistorySettingsStore.getState().enabled).toBe(false);
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "history settings",
    );
  });
});
