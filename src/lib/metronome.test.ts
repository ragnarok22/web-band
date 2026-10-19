import { describe, expect, it } from "vitest";

import {
  createDefaultMetronomeConfiguration,
  getMetronomeMeter,
  getMetronomePosition,
  getSubdivisionLabel,
  toMetronomeTransportBpm,
} from "@/lib/metronome";

describe("metronome musical time", () => {
  it.each([
    [2, 4, 2, 192],
    [3, 4, 3, 192],
    [4, 4, 4, 192],
    [5, 4, 5, 192],
    [6, 8, 2, 288],
    [12, 8, 4, 288],
  ])(
    "groups %s/%s into %s primary pulses",
    (numerator, denominator, pulses, ticks) => {
      expect(getMetronomeMeter({ numerator, denominator }, 192)).toMatchObject({
        pulsesPerMeasure: pulses,
        ticksPerPulse: ticks,
        ticksPerMeasure: pulses * ticks,
      });
    },
  );

  it("preserves an 80 BPM primary pulse when switching to compound meter", () => {
    expect(toMetronomeTransportBpm(80, { numerator: 4, denominator: 4 })).toBe(
      80,
    );
    expect(toMetronomeTransportBpm(80, { numerator: 6, denominator: 8 })).toBe(
      120,
    );
    expect(
      toMetronomeTransportBpm(220, { numerator: 12, denominator: 8 }),
    ).toBe(330);
  });

  it("names compound subdivisions by their actual note values", () => {
    expect(
      [1, 2, 3, 4].map((count) =>
        getSubdivisionLabel(count, { numerator: 6, denominator: 8 }),
      ),
    ).toEqual([
      "Dotted quarter notes",
      "Dotted eighth notes",
      "Eighth notes",
      "Dotted sixteenth notes",
    ]);
  });

  it("advances stages only after whole measures, excluding count-in", () => {
    const config = {
      ...createDefaultMetronomeConfiguration(),
      trainingMode: "progressive" as const,
      measuresPerStage: 2 as const,
    };
    expect(getMetronomePosition(config, 767, 1, 192)?.phase).toBe("count-in");
    expect(getMetronomePosition(config, 768, 1, 192)).toMatchObject({
      stage: 0,
      measure: 1,
      stageMeasure: 1,
      subdivision: 1,
    });
    expect(getMetronomePosition(config, 768 * 3, 1, 192)).toMatchObject({
      stage: 1,
      measure: 3,
      stageMeasure: 1,
      subdivision: 2,
    });
    expect(getMetronomePosition(config, 768 * 9, 1, 192)).toMatchObject({
      stage: 0,
      measure: 9,
      subdivision: 1,
    });
  });

  it("supports holding the last stage or stopping without an extra downbeat", () => {
    const config = {
      ...createDefaultMetronomeConfiguration(),
      trainingMode: "progressive" as const,
      measuresPerStage: 2 as const,
      endBehavior: "stop" as const,
    };
    expect(getMetronomePosition(config, 768 * 8, 0, 192)).toBeNull();
    expect(
      getMetronomePosition(
        { ...config, endBehavior: "hold" },
        768 * 10,
        0,
        192,
      ),
    ).toMatchObject({ stage: 3, subdivision: 4 });
  });
});
