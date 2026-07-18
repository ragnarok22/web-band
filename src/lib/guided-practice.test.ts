import { describe, expect, it } from "vitest";

import {
  basicPopPattern,
  basicSixEightPattern,
  eighthDownstrokesPattern,
} from "@/data/strumming-patterns";
import {
  getChordStepSixteenths,
  getChordTrainerPosition,
  getStrumPosition,
  isStrummingPatternMeterCompatible,
} from "@/lib/guided-practice";
import type { ChordTrainerConfiguration, StrumAction } from "@/types/practice";

const chordConfiguration: ChordTrainerConfiguration = {
  progression: {
    id: "timing-test",
    isBuiltIn: false,
    name: "Timing Test",
    steps: [
      {
        chord: "C",
        duration: 2,
        durationUnit: "beats",
        id: "timing-test-c",
      },
      {
        chord: "G",
        duration: 1,
        durationUnit: "measures",
        id: "timing-test-g",
      },
    ],
  },
  repeat: true,
  showCountdown: true,
};

describe("chord trainer timing", () => {
  it("maps beat and measure durations in 4/4", () => {
    const timeSignature = { denominator: 4, numerator: 4 };

    expect(
      getChordStepSixteenths(
        chordConfiguration.progression.steps[0]!,
        timeSignature,
      ),
    ).toBe(8);
    expect(
      getChordStepSixteenths(
        chordConfiguration.progression.steps[1]!,
        timeSignature,
      ),
    ).toBe(16);
    expect(
      getChordTrainerPosition(chordConfiguration, timeSignature, 0),
    ).toMatchObject({
      countdown: 2,
      currentChord: "C",
      currentStepIndex: 0,
      nextChord: "G",
      sixteenthsIntoStep: 0,
      sixteenthsRemaining: 8,
    });
    expect(
      getChordTrainerPosition(chordConfiguration, timeSignature, 7),
    ).toMatchObject({ countdown: 1, currentChord: "C" });
    expect(
      getChordTrainerPosition(chordConfiguration, timeSignature, 8),
    ).toMatchObject({
      countdown: 4,
      currentChord: "G",
      currentStepIndex: 1,
      nextChord: "C",
    });
    expect(
      getChordTrainerPosition(chordConfiguration, timeSignature, 24),
    ).toMatchObject({ currentChord: "C", cycle: 1 });
  });

  it("uses eighth-note beats and 12 sixteenths per measure in 6/8", () => {
    const timeSignature = { denominator: 8, numerator: 6 };
    const configuration: ChordTrainerConfiguration = {
      ...chordConfiguration,
      progression: {
        ...chordConfiguration.progression,
        steps: [
          {
            chord: "Am",
            duration: 3,
            durationUnit: "beats",
            id: "six-eight-am",
          },
          {
            chord: "E7",
            duration: 1,
            durationUnit: "measures",
            id: "six-eight-e-seven",
          },
        ],
      },
    };

    expect(
      getChordStepSixteenths(
        configuration.progression.steps[0]!,
        timeSignature,
      ),
    ).toBe(6);
    expect(
      getChordStepSixteenths(
        configuration.progression.steps[1]!,
        timeSignature,
      ),
    ).toBe(12);
    expect(
      getChordTrainerPosition(configuration, timeSignature, 5),
    ).toMatchObject({ countdown: 1, currentChord: "Am" });
    expect(
      getChordTrainerPosition(configuration, timeSignature, 6),
    ).toMatchObject({ countdown: 6, currentChord: "E7" });
    expect(
      getChordTrainerPosition(configuration, timeSignature, 18),
    ).toMatchObject({ currentChord: "Am", cycle: 1 });
  });

  it("finishes a non-repeating progression and omits a disabled countdown", () => {
    const configuration = {
      ...chordConfiguration,
      repeat: false,
      showCountdown: false,
    };
    const timeSignature = { denominator: 4, numerator: 4 };

    expect(
      getChordTrainerPosition(configuration, timeSignature, 8),
    ).toMatchObject({ countdown: null, currentChord: "G", nextChord: null });
    expect(getChordTrainerPosition(configuration, timeSignature, 24)).toEqual({
      countdown: null,
      currentChord: null,
      currentStepId: null,
      currentStepIndex: null,
      cycle: 0,
      isComplete: true,
      nextChord: null,
      nextStepId: null,
      sixteenthsIntoStep: 0,
      sixteenthsRemaining: 0,
    });
  });
});

describe("strumming timing", () => {
  it("maps every action at sixteenth-note boundaries and wraps next", () => {
    const expectedActions: StrumAction[] = [
      "down",
      "hold",
      "rest",
      "up",
      "mute",
      "hold",
      "down",
      "up",
      "rest",
      "up",
      "hold",
      "up",
      "down",
      "hold",
      "rest",
      "up",
    ];

    expect(
      expectedActions.map(
        (_, index) => getStrumPosition(basicPopPattern, index).currentAction,
      ),
    ).toEqual(expectedActions);
    expect(getStrumPosition(basicPopPattern, 0)).toMatchObject({
      accent: true,
      currentAction: "down",
      isStepBoundary: true,
      nextAction: "hold",
      stepIndex: 0,
    });
    expect(getStrumPosition(basicPopPattern, 15)).toMatchObject({
      currentAction: "up",
      nextAction: "down",
      stepIndex: 15,
    });
    expect(getStrumPosition(basicPopPattern, 16).stepIndex).toBe(0);
  });

  it("retains an eighth-note action between sixteenth boundaries", () => {
    expect(getStrumPosition(eighthDownstrokesPattern, 0)).toMatchObject({
      isStepBoundary: true,
      stepIndex: 0,
    });
    expect(getStrumPosition(eighthDownstrokesPattern, 1)).toMatchObject({
      isStepBoundary: false,
      stepIndex: 0,
    });
    expect(getStrumPosition(eighthDownstrokesPattern, 2)).toMatchObject({
      isStepBoundary: true,
      stepIndex: 1,
    });
  });

  it("maps and wraps all six subdivisions in 6/8", () => {
    expect(
      Array.from({ length: 6 }, (_, index) =>
        getStrumPosition(basicSixEightPattern, index * 2),
      ).map((position) => position.currentAction),
    ).toEqual(["down", "hold", "rest", "up", "down", "up"]);
    expect(getStrumPosition(basicSixEightPattern, 11).stepIndex).toBe(5);
    expect(getStrumPosition(basicSixEightPattern, 12).stepIndex).toBe(0);
  });

  it("checks exact meter compatibility", () => {
    expect(
      isStrummingPatternMeterCompatible(basicSixEightPattern, {
        denominator: 8,
        numerator: 6,
      }),
    ).toBe(true);
    expect(
      isStrummingPatternMeterCompatible(basicSixEightPattern, {
        denominator: 4,
        numerator: 3,
      }),
    ).toBe(false);
    expect(
      isStrummingPatternMeterCompatible(basicPopPattern, {
        denominator: 4,
        numerator: 4,
      }),
    ).toBe(true);
  });

  it("rejects negative and fractional absolute sixteenth positions", () => {
    expect(() => getStrumPosition(basicPopPattern, -1)).toThrow(RangeError);
    expect(() => getStrumPosition(basicPopPattern, 0.5)).toThrow(RangeError);
  });
});
