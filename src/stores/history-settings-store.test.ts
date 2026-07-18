import { beforeEach, describe, expect, it } from "vitest";

import {
  defaultHistorySettings,
  HISTORY_SETTINGS_KEY,
} from "@/db/repositories/history-settings-repository";
import { useHistorySettingsStore } from "@/stores/history-settings-store";

describe("history settings store", () => {
  beforeEach(() => {
    useHistorySettingsStore.setState({
      ...defaultHistorySettings,
      hasHydrated: false,
    });
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
    expect(useHistorySettingsStore.getState().minimumDurationSeconds).toBe(0);
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
  });
});
