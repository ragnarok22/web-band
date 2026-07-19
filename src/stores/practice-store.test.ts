import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultPracticeSettings } from "@/db/repositories/settings-repository";
import { usePracticeStore } from "@/stores/practice-store";
import type { PracticePresetConfiguration } from "@/types/persistence";

beforeEach(() => {
  usePracticeStore.setState({
    ...structuredClone(defaultPracticeSettings),
    hasHydrated: false,
  });
});

describe("practice store preset configuration", () => {
  it("replaces and persists the complete settings snapshot", () => {
    const settings = {
      ...structuredClone(defaultPracticeSettings),
      bpm: 121,
      masterVolume: 0.4,
      selectedPatternId: "one-drop",
      wakeLockEnabled: false,
    };

    expect(usePracticeStore.getState().replaceSettings(settings)).toBe(true);
    settings.mixer.kick.volume = 0;
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: 121,
      masterVolume: 0.4,
      selectedPatternId: "one-drop",
      wakeLockEnabled: false,
    });
    expect(usePracticeStore.getState().mixer.kick.volume).not.toBe(0);
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v3") ?? "null",
      ),
    ).toMatchObject({ bpm: 121, selectedPatternId: "one-drop" });
  });

  it("applies every preset field without changing global sound character", () => {
    const configuration: PracticePresetConfiguration = {
      bpm: 128,
      countInMeasures: 2,
      fillFrequency: "random",
      guidedPractice: { mode: "drums" },
      humanization: 0.25,
      patternId: "one-drop",
      swing: 0.4,
    };
    usePracticeStore.setState({ soundCharacter: "punchy" });
    const listener = vi.fn();
    const unsubscribe = usePracticeStore.subscribe(listener);

    usePracticeStore.getState().applyConfiguration(configuration);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(usePracticeStore.getState()).toMatchObject({
      bpm: 128,
      countInMeasures: 2,
      fillFrequency: "random",
      humanization: 0.25,
      selectedPatternId: "one-drop",
      soundCharacter: "punchy",
      swing: 0.4,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v3") ?? "null",
      ),
    ).toMatchObject({
      bpm: 128,
      selectedPatternId: "one-drop",
      soundCharacter: "punchy",
    });
    unsubscribe();
  });

  it("rejects invalid preset fields without a partial update", () => {
    const before = usePracticeStore.getState().bpm;
    expect(() =>
      usePracticeStore.getState().applyConfiguration({
        bpm: 500,
        countInMeasures: 1,
        fillFrequency: null,
        guidedPractice: { mode: "drums" },
        humanization: 0,
        patternId: "basic-rock",
        swing: 0,
      }),
    ).toThrow("Practice preset configuration is invalid.");
    expect(usePracticeStore.getState().bpm).toBe(before);
  });
});
