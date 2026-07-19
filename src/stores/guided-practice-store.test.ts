import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cGAmFProgression, gDEmCProgression } from "@/data/chord-progressions";
import { basicPopPattern } from "@/data/strumming-patterns";
import {
  createDefaultGuidedPracticeValues,
  getGuidedPracticeConfiguration,
  GUIDED_PRACTICE_STORAGE_KEY,
  useGuidedPracticeStore,
} from "@/stores/guided-practice-store";
import { useStorageStore } from "@/stores/storage-store";

beforeEach(() => {
  useGuidedPracticeStore.setState({
    ...createDefaultGuidedPracticeValues(),
    isHydrated: false,
  });
  useStorageStore.setState({ preferenceWriteFailures: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("guided practice store", () => {
  it("reports a failed normal preference write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    useGuidedPracticeStore.getState().setMode("chords");

    expect(useGuidedPracticeStore.getState().mode).toBe("chords");
    expect(useStorageStore.getState().preferenceWriteFailures).toContain(
      "guided practice",
    );
  });

  it("replaces and persists all backup settings in one store update", () => {
    const settings = {
      ...createDefaultGuidedPracticeValues(),
      chordTrainer: {
        progression: structuredClone(cGAmFProgression),
        repeat: false,
        showCountdown: false,
      },
      mode: "chords" as const,
    };
    const listener = vi.fn();
    const unsubscribe = useGuidedPracticeStore.subscribe(listener);

    expect(useGuidedPracticeStore.getState().replaceSettings(settings)).toBe(
      true,
    );
    expect(listener).toHaveBeenCalledTimes(1);
    expect(useGuidedPracticeStore.getState()).toMatchObject(settings);
    expect(
      JSON.parse(
        window.localStorage.getItem(GUIDED_PRACTICE_STORAGE_KEY) ?? "null",
      ),
    ).toMatchObject({ mode: "chords", version: 1 });
    unsubscribe();
  });

  it("persists and hydrates versioned editable configurations", () => {
    const store = useGuidedPracticeStore.getState();
    store.setChordTrainerConfiguration({
      progression: cGAmFProgression,
      repeat: false,
      showCountdown: false,
    });
    store.setStrummingPattern(basicPopPattern);
    store.setMode("chords");

    const persisted = JSON.parse(
      window.localStorage.getItem(GUIDED_PRACTICE_STORAGE_KEY) ?? "null",
    ) as { version?: number } | null;
    expect(persisted?.version).toBe(1);

    useGuidedPracticeStore.setState({
      ...createDefaultGuidedPracticeValues(),
      isHydrated: false,
    });
    useGuidedPracticeStore.getState().hydrate();

    expect(useGuidedPracticeStore.getState()).toMatchObject({
      chordTrainer: {
        progression: cGAmFProgression,
        repeat: false,
        showCountdown: false,
      },
      isHydrated: true,
      mode: "chords",
      strummingPattern: {
        ...basicPopPattern,
        steps: basicPopPattern.steps.map((step) =>
          step.accent === undefined
            ? {
                action: step.action,
                id: step.id,
                subdivisionIndex: step.subdivisionIndex,
              }
            : step,
        ),
      },
    });
  });

  it("uses safe built-in defaults for corrupt persisted fields", () => {
    window.localStorage.setItem(
      GUIDED_PRACTICE_STORAGE_KEY,
      JSON.stringify({
        chordTrainer: { progression: null },
        mode: "chords",
        strummingPattern: { id: "broken" },
        tempoTrainer: { startBpm: 500 },
        version: 1,
      }),
    );

    useGuidedPracticeStore.getState().hydrate();
    const state = useGuidedPracticeStore.getState();
    expect(state.mode).toBe("chords");
    expect(state.chordTrainer.progression).toEqual(gDEmCProgression);
    expect(state.isHydrated).toBe(true);
  });

  it("applies discriminated snapshots atomically and snapshots by value", () => {
    const listener = vi.fn();
    const unsubscribe = useGuidedPracticeStore.subscribe(listener);
    const configuration = {
      chordTrainer: {
        progression: structuredClone(cGAmFProgression),
        repeat: true,
        showCountdown: true,
      },
      mode: "chords" as const,
    };

    useGuidedPracticeStore.getState().applyConfiguration(configuration);
    expect(listener).toHaveBeenCalledTimes(1);
    configuration.chordTrainer.progression.steps[0]!.chord = "mutated";
    expect(
      useGuidedPracticeStore.getState().chordTrainer.progression.steps[0]
        ?.chord,
    ).toBe("C");

    const snapshot = getGuidedPracticeConfiguration(
      useGuidedPracticeStore.getState(),
    );
    expect(snapshot).toMatchObject({ mode: "chords" });
    if (snapshot.mode === "chords") {
      snapshot.chordTrainer.progression.steps[0]!.chord = "snapshot mutation";
    }
    expect(
      useGuidedPracticeStore.getState().chordTrainer.progression.steps[0]
        ?.chord,
    ).toBe("C");
    unsubscribe();
  });

  it("rejects invalid atomic snapshots", () => {
    expect(() =>
      useGuidedPracticeStore.getState().applyConfiguration({
        mode: "tempoTrainer",
        tempoTrainer: {
          ...useGuidedPracticeStore.getState().tempoTrainer,
          startBpm: 500,
        },
      }),
    ).toThrow("Guided practice configuration is invalid.");
  });
});
