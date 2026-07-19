import { describe, expect, it } from "vitest";

import {
  defaultPracticeSettings,
  getStartupPracticeSettings,
  loadPracticeSettings,
  savePracticeSettings,
} from "@/db/repositories/settings-repository";

describe("practice settings repository", () => {
  it("round-trips small practice settings through localStorage", () => {
    const settings = {
      ...defaultPracticeSettings,
      bpm: 127,
      bpmAdjustmentStep: 5 as const,
      countInMeasures: 2 as const,
      fillFrequency: 8 as const,
      humanization: 0.24,
      masterVolume: 0.42,
      mixer: {
        ...defaultPracticeSettings.mixer,
        snare: { muted: true, solo: false, volume: 0.63 },
      },
      restoreLastPractice: false,
      selectedPatternId: "custom-groove",
      soundCharacter: "punchy" as const,
      swing: 0.34,
      wakeLockEnabled: false,
    };

    expect(savePracticeSettings(settings)).toBe(true);
    expect(loadPracticeSettings()).toEqual(settings);
  });

  it("falls back safely when stored settings are corrupted", () => {
    window.localStorage.setItem("web-band-practice-settings-v3", "{broken");
    expect(loadPracticeSettings()).toEqual(defaultPracticeSettings);
  });

  it("fills Phase 4 defaults while loading legacy settings", () => {
    window.localStorage.setItem(
      "web-band-practice-settings-v1",
      JSON.stringify({
        bpm: 900,
        masterVolume: -2,
        selectedPatternId: "basic-rock",
      }),
    );

    expect(loadPracticeSettings()).toEqual({
      ...defaultPracticeSettings,
      bpm: 220,
      masterVolume: defaultPracticeSettings.masterVolume,
      selectedPatternId: "basic-rock",
    });
  });

  it("validates stored Phase 4 settings", () => {
    window.localStorage.setItem(
      "web-band-practice-settings-v2",
      JSON.stringify({
        bpm: 120,
        countInMeasures: 3,
        fillFrequency: 6,
        humanization: 2,
        masterVolume: Number.NaN,
        mixer: {
          kick: { muted: true, solo: true, volume: -1 },
          snare: { muted: "yes", solo: false, volume: 0.4 },
        },
        selectedPatternId: "funk",
        swing: 1,
        wakeLockEnabled: false,
      }),
    );

    expect(loadPracticeSettings()).toEqual({
      ...defaultPracticeSettings,
      bpm: 120,
      humanization: 1,
      masterVolume: defaultPracticeSettings.masterVolume,
      mixer: {
        ...defaultPracticeSettings.mixer,
        kick: { muted: true, solo: true, volume: 0 },
        snare: { muted: false, solo: false, volume: 0.4 },
      },
      selectedPatternId: "funk",
      swing: 0.65,
      wakeLockEnabled: false,
    });
  });

  it("migrates version 2 settings to the Balanced sound character", () => {
    window.localStorage.setItem(
      "web-band-practice-settings-v2",
      JSON.stringify({ ...defaultPracticeSettings, soundCharacter: undefined }),
    );

    expect(loadPracticeSettings().soundCharacter).toBe("balanced");
  });

  it("migrates version 3 settings with Phase 9 defaults", () => {
    const legacy = structuredClone(
      defaultPracticeSettings,
    ) as unknown as Record<string, unknown>;
    delete legacy.bpmAdjustmentStep;
    delete legacy.restoreLastPractice;
    legacy.bpm = 135;
    legacy.countInMeasures = 4;
    legacy.wakeLockEnabled = false;
    window.localStorage.setItem(
      "web-band-practice-settings-v3",
      JSON.stringify(legacy),
    );

    expect(loadPracticeSettings()).toMatchObject({
      bpm: 135,
      bpmAdjustmentStep: 1,
      countInMeasures: 4,
      restoreLastPractice: true,
      wakeLockEnabled: false,
    });
  });

  it("resets only session-specific values when restore is disabled", () => {
    const settings = {
      ...structuredClone(defaultPracticeSettings),
      bpm: 144,
      bpmAdjustmentStep: 5 as const,
      countInMeasures: 4 as const,
      fillFrequency: 8 as const,
      humanization: 0.2,
      masterVolume: 0.4,
      restoreLastPractice: false,
      selectedPatternId: "funk",
      swing: 0.3,
      wakeLockEnabled: false,
    };

    expect(getStartupPracticeSettings(settings)).toEqual({
      ...settings,
      bpm: defaultPracticeSettings.bpm,
      fillFrequency: defaultPracticeSettings.fillFrequency,
      humanization: defaultPracticeSettings.humanization,
      selectedPatternId: defaultPracticeSettings.selectedPatternId,
      swing: defaultPracticeSettings.swing,
    });
  });
});
