import { describe, expect, it } from "vitest";

import {
  getTempoTrainerPosition,
  getTempoTrainerStopBpm,
  type TempoTrainerProgress,
} from "@/lib/tempo-trainer";
import type { TempoTrainerConfiguration } from "@/types/practice";

const measureConfiguration: TempoTrainerConfiguration = {
  endBpm: 110,
  increment: 2,
  interval: { measures: 4, type: "measures" },
  resetToStartingBpmOnStop: true,
  startBpm: 70,
  stopAtTarget: true,
};

function progress(
  completedMeasures: number,
  elapsedSeconds = 0,
  latestMeasureBoundarySeconds = elapsedSeconds,
): TempoTrainerProgress {
  return {
    completedMeasures,
    elapsedSeconds,
    latestMeasureBoundarySeconds,
  };
}

describe("tempo trainer", () => {
  it("progresses 70 to 110 by 2 every four completed measures", () => {
    expect(getTempoTrainerPosition(measureConfiguration, progress(0))).toEqual({
      completedIntervals: 0,
      currentBpm: 70,
      isAtTarget: false,
      measuresUntilChange: 4,
      nextBpm: 72,
      progress: 0,
      secondsUntilChange: null,
      shouldStop: false,
    });
    expect(
      getTempoTrainerPosition(measureConfiguration, progress(3)),
    ).toMatchObject({
      currentBpm: 70,
      measuresUntilChange: 1,
    });
    expect(
      getTempoTrainerPosition(measureConfiguration, progress(4)),
    ).toMatchObject({
      completedIntervals: 1,
      currentBpm: 72,
      measuresUntilChange: 4,
      nextBpm: 74,
      progress: 0.05,
    });
    expect(
      getTempoTrainerPosition(measureConfiguration, progress(79)),
    ).toMatchObject({
      currentBpm: 108,
      measuresUntilChange: 1,
      nextBpm: 110,
      progress: 0.95,
    });
    expect(getTempoTrainerPosition(measureConfiguration, progress(80))).toEqual(
      {
        completedIntervals: 20,
        currentBpm: 110,
        isAtTarget: true,
        measuresUntilChange: null,
        nextBpm: null,
        progress: 1,
        secondsUntilChange: null,
        shouldStop: true,
      },
    );
  });

  it("clamps a descending non-divisible progression exactly to its target", () => {
    const configuration: TempoTrainerConfiguration = {
      endBpm: 70,
      increment: 8,
      interval: { measures: 1, type: "measures" },
      resetToStartingBpmOnStop: false,
      startBpm: 111,
      stopAtTarget: false,
    };

    expect(getTempoTrainerPosition(configuration, progress(5))).toMatchObject({
      currentBpm: 71,
      isAtTarget: false,
      nextBpm: 70,
      progress: 40 / 41,
    });
    expect(getTempoTrainerPosition(configuration, progress(6))).toMatchObject({
      completedIntervals: 6,
      currentBpm: 70,
      isAtTarget: true,
      nextBpm: null,
      progress: 1,
      shouldStop: false,
    });
    expect(getTempoTrainerPosition(configuration, progress(100))).toMatchObject(
      { completedIntervals: 6, currentBpm: 70 },
    );
  });

  it("quantizes elapsed-second thresholds to completed measure boundaries", () => {
    const configuration: TempoTrainerConfiguration = {
      ...measureConfiguration,
      interval: { seconds: 10, type: "seconds" },
    };

    expect(
      getTempoTrainerPosition(configuration, progress(1, 10.5, 8)),
    ).toMatchObject({
      currentBpm: 70,
      nextBpm: 72,
      secondsUntilChange: 0,
    });
    expect(
      getTempoTrainerPosition(configuration, progress(2, 12, 12)),
    ).toMatchObject({
      completedIntervals: 1,
      currentBpm: 72,
      secondsUntilChange: 8,
    });
    expect(
      getTempoTrainerPosition(configuration, progress(3, 20.1, 18)),
    ).toMatchObject({ currentBpm: 72, secondsUntilChange: 0 });
    expect(
      getTempoTrainerPosition(configuration, progress(4, 24, 24)),
    ).toMatchObject({ completedIntervals: 2, currentBpm: 74 });
  });

  it("handles a trainer that starts at its target and reset-on-stop", () => {
    const configuration: TempoTrainerConfiguration = {
      ...measureConfiguration,
      endBpm: 90,
      startBpm: 90,
    };
    const position = getTempoTrainerPosition(configuration, progress(0));

    expect(position).toMatchObject({
      currentBpm: 90,
      isAtTarget: true,
      nextBpm: null,
      progress: 1,
      shouldStop: true,
    });
    expect(getTempoTrainerStopBpm(measureConfiguration, position)).toBe(70);
    expect(
      getTempoTrainerStopBpm(
        { ...measureConfiguration, resetToStartingBpmOnStop: false },
        { ...position, currentBpm: 96 },
      ),
    ).toBe(96);
  });

  it("rejects invalid absolute progress", () => {
    expect(() =>
      getTempoTrainerPosition(measureConfiguration, progress(-1)),
    ).toThrow(RangeError);
    expect(() =>
      getTempoTrainerPosition(measureConfiguration, progress(1, 4, 5)),
    ).toThrow(RangeError);
  });
});
