import { beforeEach, describe, expect, it } from "vitest";

import { reportPreferenceWrite, useStorageStore } from "@/stores/storage-store";

beforeEach(() => {
  useStorageStore.setState({
    corruptRowCounts: {},
    isInitialized: false,
    mode: "memory",
    preferenceWriteFailures: [],
    warning: null,
  });
});

describe("storage diagnostics", () => {
  it("deduplicates failed preference areas and clears only a successful area", () => {
    reportPreferenceWrite("Appearance", false);
    reportPreferenceWrite("Appearance", false);
    reportPreferenceWrite("  Practice settings  ", false);

    expect(useStorageStore.getState().preferenceWriteFailures).toEqual([
      "Appearance",
      "Practice settings",
    ]);

    reportPreferenceWrite("Appearance", true);
    reportPreferenceWrite("Unknown area", true);
    reportPreferenceWrite(" ", false);

    expect(useStorageStore.getState().preferenceWriteFailures).toEqual([
      "Practice settings",
    ]);
    reportPreferenceWrite("Practice settings", true);
    expect(useStorageStore.getState().preferenceWriteFailures).toEqual([]);
  });

  it("keeps fallback, preference, and corrupt-row diagnostics independent", () => {
    reportPreferenceWrite("History settings", false);
    useStorageStore.getState().setCorruptRowCounts({ customPatterns: 2 });
    useStorageStore
      .getState()
      .setStorageStatus("memory", "IndexedDB is unavailable.");

    expect(useStorageStore.getState()).toMatchObject({
      corruptRowCounts: { customPatterns: 2 },
      mode: "memory",
      preferenceWriteFailures: ["History settings"],
      warning: "IndexedDB is unavailable.",
    });
  });
});
