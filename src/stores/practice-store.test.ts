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
  it("applies every base preset field atomically and persists it", () => {
    const configuration: PracticePresetConfiguration = {
      bpm: 128,
      countInMeasures: 2,
      fillFrequency: "random",
      guidedPractice: { mode: "drums" },
      humanization: 0.25,
      patternId: "one-drop",
      swing: 0.4,
    };
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
      swing: 0.4,
    });
    expect(
      JSON.parse(
        window.localStorage.getItem("web-band-practice-settings-v2") ?? "null",
      ),
    ).toMatchObject({ bpm: 128, selectedPatternId: "one-drop" });
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
