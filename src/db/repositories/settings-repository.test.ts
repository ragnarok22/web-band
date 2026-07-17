import { describe, expect, it } from "vitest";

import {
  defaultPracticeSettings,
  loadPracticeSettings,
  savePracticeSettings,
} from "@/db/repositories/settings-repository";

describe("practice settings repository", () => {
  it("round-trips small practice settings through localStorage", () => {
    const settings = {
      bpm: 127,
      masterVolume: 0.42,
      selectedPatternId: "custom-groove",
    };

    expect(savePracticeSettings(settings)).toBe(true);
    expect(loadPracticeSettings()).toEqual(settings);
  });

  it("falls back safely when stored settings are corrupted", () => {
    window.localStorage.setItem("web-band-practice-settings-v1", "{broken");
    expect(loadPracticeSettings()).toEqual(defaultPracticeSettings);
  });

  it("clamps stored BPM and rejects invalid volume", () => {
    window.localStorage.setItem(
      "web-band-practice-settings-v1",
      JSON.stringify({
        bpm: 900,
        masterVolume: -2,
        selectedPatternId: "basic-rock",
      }),
    );

    expect(loadPracticeSettings()).toEqual({
      bpm: 220,
      masterVolume: defaultPracticeSettings.masterVolume,
      selectedPatternId: "basic-rock",
    });
  });
});
