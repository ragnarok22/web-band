import { afterEach, describe, expect, it, vi } from "vitest";

import {
  defaultHistorySettings,
  HISTORY_SETTINGS_KEY,
  loadHistorySettings,
  saveHistorySettings,
} from "@/db/repositories/history-settings-repository";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("history settings repository", () => {
  it("uses defaults when settings are missing, corrupt, or invalid", () => {
    expect(loadHistorySettings()).toEqual(defaultHistorySettings);

    window.localStorage.setItem(HISTORY_SETTINGS_KEY, "not-json");
    expect(loadHistorySettings()).toEqual(defaultHistorySettings);

    window.localStorage.setItem(
      HISTORY_SETTINGS_KEY,
      JSON.stringify({
        settings: { enabled: true, minimumDurationSeconds: "30" },
        version: 1,
      }),
    );
    expect(loadHistorySettings()).toEqual(defaultHistorySettings);

    window.localStorage.setItem(
      HISTORY_SETTINGS_KEY,
      JSON.stringify({
        extra: true,
        settings: defaultHistorySettings,
        version: 1,
      }),
    );
    expect(loadHistorySettings()).toEqual(defaultHistorySettings);
  });

  it("round-trips strictly versioned settings", () => {
    const settings = { enabled: false, minimumDurationSeconds: 75 };

    expect(saveHistorySettings(settings)).toBe(true);
    expect(
      JSON.parse(window.localStorage.getItem(HISTORY_SETTINGS_KEY)!),
    ).toEqual({ settings, version: 1 });
    expect(loadHistorySettings()).toEqual(settings);
  });

  it("falls back safely when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadHistorySettings()).toEqual(defaultHistorySettings);

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(saveHistorySettings(defaultHistorySettings)).toBe(false);
  });
});
