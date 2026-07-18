import { describe, expect, it } from "vitest";

import { GuidedPracticeController } from "@/audio/guided-practice-controller";
import {
  basicPopPattern,
  basicSixEightPattern,
} from "@/data/strumming-patterns";
import type {
  ChordTrainerConfiguration,
  TempoTrainerConfiguration,
} from "@/types/practice";

const fourFour = { denominator: 4, numerator: 4 } as const;

function tempoConfiguration(
  overrides: Partial<TempoTrainerConfiguration> = {},
): TempoTrainerConfiguration {
  return {
    endBpm: 64,
    increment: 2,
    interval: { measures: 1, type: "measures" },
    resetToStartingBpmOnStop: false,
    startBpm: 60,
    stopAtTarget: true,
    ...overrides,
  };
}

function tickThrough(
  controller: GuidedPracticeController,
  absoluteSixteenth: number,
) {
  let tick = controller.tick();
  for (let index = 0; index < absoluteSixteenth; index += 1) {
    tick = controller.tick();
  }
  return tick;
}

describe("guided practice controller", () => {
  it("changes ascending tempo exactly at measure boundaries", () => {
    const controller = new GuidedPracticeController();
    controller.begin(
      { mode: "tempoTrainer", tempoTrainer: tempoConfiguration() },
      fourFour,
      120,
    );

    const beforeBoundary = tickThrough(controller, 15);
    const boundary = controller.tick();

    expect(beforeBoundary.frame).toMatchObject({
      absoluteSixteenth: 15,
      elapsedSeconds: 3.75,
      measure: 1,
    });
    expect(beforeBoundary.bpmChange).toBeNull();
    expect(boundary).toMatchObject({
      bpmChange: 62,
      frame: {
        absoluteSixteenth: 16,
        elapsedSeconds: 4,
        measure: 2,
        position: { currentBpm: 62 },
      },
      shouldStop: false,
    });
  });

  it("handles descending targets and emits target stop once", () => {
    const controller = new GuidedPracticeController();
    controller.begin(
      {
        mode: "tempoTrainer",
        tempoTrainer: tempoConfiguration({
          endBpm: 70,
          increment: 8,
          startBpm: 86,
        }),
      },
      fourFour,
      90,
    );

    expect(tickThrough(controller, 16).bpmChange).toBe(78);
    const target = tickThrough(controller, 15);
    expect(target).toMatchObject({ bpmChange: 70, shouldStop: true });
    expect(controller.tick()).toMatchObject({
      bpmChange: null,
      shouldStop: false,
    });
  });

  it("quantizes elapsed-second changes to musical measure boundaries", () => {
    const controller = new GuidedPracticeController();
    controller.begin(
      {
        mode: "tempoTrainer",
        tempoTrainer: tempoConfiguration({
          endBpm: 66,
          interval: { seconds: 3, type: "seconds" },
          stopAtTarget: false,
        }),
      },
      fourFour,
      90,
    );

    expect(tickThrough(controller, 12).frame).toMatchObject({
      elapsedSeconds: 3,
      position: { currentBpm: 60, secondsUntilChange: 0 },
    });
    expect(tickThrough(controller, 3)).toMatchObject({ bpmChange: 62 });
    const secondBoundary = tickThrough(controller, 15);
    expect(secondBoundary.bpmChange).toBe(64);
    expect(secondBoundary.frame.elapsedSeconds).toBeCloseTo(7.8709677);
  });

  it("changes tempo at an exact 16-second boundary at 75 BPM", () => {
    const controller = new GuidedPracticeController();
    controller.begin(
      {
        mode: "tempoTrainer",
        tempoTrainer: tempoConfiguration({
          endBpm: 77,
          interval: { seconds: 16, type: "seconds" },
          startBpm: 75,
        }),
      },
      fourFour,
      75,
    );

    const boundary = tickThrough(controller, 80);

    expect(boundary.frame.elapsedSeconds).toBeCloseTo(16);
    expect(boundary).toMatchObject({
      bpmChange: 77,
      frame: {
        absoluteSixteenth: 80,
        position: { completedIntervals: 1, currentBpm: 77 },
      },
      shouldStop: true,
    });
  });

  it("retains chord and elapsed state when no paused ticks occur", () => {
    const chordTrainer: ChordTrainerConfiguration = {
      progression: {
        id: "controller-chords",
        isBuiltIn: false,
        name: "Controller chords",
        steps: [
          {
            chord: "C",
            duration: 1,
            durationUnit: "beats",
            id: "c",
          },
          {
            chord: "G",
            duration: 1,
            durationUnit: "beats",
            id: "g",
          },
        ],
      },
      repeat: true,
      showCountdown: true,
    };
    const controller = new GuidedPracticeController();
    controller.begin({ chordTrainer, mode: "chords" }, fourFour, 60);

    expect(tickThrough(controller, 3).frame).toMatchObject({
      absoluteSixteenth: 3,
      elapsedSeconds: 0.75,
      position: { currentChord: "C" },
    });
    expect(controller.tick().frame).toMatchObject({
      absoluteSixteenth: 4,
      elapsedSeconds: 1,
      position: { currentChord: "G" },
    });
  });

  it("emits every sixteenth strum position and resets on a new session", () => {
    const controller = new GuidedPracticeController();
    controller.begin(
      { mode: "strumming", strummingPattern: basicPopPattern },
      fourFour,
      90,
    );

    const indices = Array.from({ length: 16 }, () => {
      const frame = controller.tick().frame;
      return frame.mode === "strumming" ? frame.position.stepIndex : -1;
    });
    expect(indices).toEqual(Array.from({ length: 16 }, (_, index) => index));

    controller.reset();
    expect(() => controller.tick()).toThrow("has not begun");
    controller.begin({ mode: "drums" }, fourFour, 100);
    expect(controller.tick().frame).toMatchObject({
      absoluteSixteenth: 0,
      elapsedSeconds: 0,
      measure: 1,
    });
  });

  it("rejects incompatible chord and strumming meter changes", () => {
    const controller = new GuidedPracticeController();
    const chordTrainer: ChordTrainerConfiguration = {
      progression: {
        id: "one-chord",
        isBuiltIn: false,
        name: "One chord",
        steps: [
          {
            chord: "C",
            duration: 1,
            durationUnit: "measures",
            id: "c",
          },
        ],
      },
      repeat: true,
      showCountdown: false,
    };
    controller.begin({ chordTrainer, mode: "chords" }, fourFour, 90);
    expect(
      controller.isTimeSignatureCompatible({ denominator: 8, numerator: 6 }),
    ).toBe(false);

    expect(() =>
      controller.begin(
        { mode: "strumming", strummingPattern: basicSixEightPattern },
        fourFour,
        90,
      ),
    ).toThrow("must match");

    controller.begin(
      { mode: "strumming", strummingPattern: basicPopPattern },
      fourFour,
      90,
    );
    expect(
      controller.isTimeSignatureCompatible({ denominator: 8, numerator: 6 }),
    ).toBe(false);
  });
});
