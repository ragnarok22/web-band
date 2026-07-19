import { validateFillLibrary } from "@/lib/fill-validation";
import type { FillArrangement, SupportedFillMeter } from "@/types/fill";
import type { PatternCategory } from "@/types/pattern";

export const supportedFillMeters: SupportedFillMeter[] = [
  "2/4",
  "3/4",
  "4/4",
  "5/4",
  "6/8",
  "7/8",
  "12/8",
];

const allMeters = [...supportedFillMeters];

export const builtInFills: FillArrangement[] = [
  {
    compatibility: {
      categories: ["rock", "pop", "blues", "country", "metal", "custom"],
      meters: allMeters,
    },
    id: "compact-tom-drop",
    name: "Compact Tom Drop",
    tail: {
      8: [
        [{ instrument: "snare", velocity: 0.72 }],
        [
          { instrument: "lowTom", velocity: 0.9 },
          { instrument: "kick", velocity: 0.84 },
        ],
      ],
      16: [
        [{ instrument: "snare", velocity: 0.64 }],
        [{ instrument: "highTom", velocity: 0.72 }],
        [{ instrument: "midTom", velocity: 0.8 }],
        [
          { instrument: "lowTom", velocity: 0.92 },
          { instrument: "kick", velocity: 0.86 },
        ],
      ],
    },
  },
  {
    compatibility: {
      categories: ["rock", "pop", "reggae", "country", "ballad", "custom"],
      meters: allMeters,
    },
    id: "backbeat-lift",
    name: "Backbeat Lift",
    tail: {
      8: [
        [{ instrument: "snare", velocity: 0.68 }],
        [
          { instrument: "snare", velocity: 0.94 },
          { instrument: "kick", velocity: 0.8 },
        ],
      ],
      16: [
        [{ instrument: "snare", velocity: 0.52 }],
        [{ instrument: "snare", velocity: 0.66 }],
        [{ instrument: "snare", velocity: 0.78 }],
        [
          { instrument: "snare", velocity: 0.96 },
          { instrument: "kick", velocity: 0.82 },
        ],
      ],
    },
  },
  {
    compatibility: {
      categories: ["pop", "funk", "reggae", "latin", "jazz", "custom"],
      meters: allMeters,
    },
    id: "pocket-turn",
    name: "Pocket Turn",
    tail: {
      8: [
        [
          { instrument: "rim", velocity: 0.55 },
          { instrument: "kick", velocity: 0.65 },
        ],
        [{ instrument: "snare", velocity: 0.88 }],
      ],
      16: [
        [{ instrument: "rim", velocity: 0.48 }],
        [],
        [
          { instrument: "highTom", velocity: 0.7 },
          { instrument: "kick", velocity: 0.62 },
        ],
        [{ instrument: "snare", velocity: 0.9 }],
      ],
    },
  },
  {
    compatibility: {
      categories: ["rock", "blues", "country", "ballad", "jazz", "custom"],
      meters: ["6/8", "12/8"],
    },
    id: "compound-tom-wave",
    name: "Compound Tom Wave",
    tail: {
      8: [
        [{ instrument: "highTom", velocity: 0.68 }],
        [{ instrument: "midTom", velocity: 0.76 }],
        [
          { instrument: "lowTom", velocity: 0.92 },
          { instrument: "kick", velocity: 0.84 },
        ],
      ],
      16: [
        [{ instrument: "snare", velocity: 0.52 }],
        [{ instrument: "highTom", velocity: 0.62 }],
        [{ instrument: "highTom", velocity: 0.7 }],
        [{ instrument: "midTom", velocity: 0.76 }],
        [{ instrument: "lowTom", velocity: 0.84 }],
        [
          { instrument: "lowTom", velocity: 0.96 },
          { instrument: "kick", velocity: 0.86 },
        ],
      ],
    },
  },
  {
    compatibility: {
      categories: ["rock", "funk", "latin", "metal", "custom"],
      meters: ["5/4", "7/8"],
    },
    id: "odd-meter-pivot",
    name: "Odd Meter Pivot",
    tail: {
      8: [
        [
          { instrument: "snare", velocity: 0.62 },
          { instrument: "highTom", velocity: 0.68 },
        ],
        [{ instrument: "midTom", velocity: 0.78 }],
        [
          { instrument: "lowTom", velocity: 0.94 },
          { instrument: "kick", velocity: 0.88 },
        ],
      ],
      16: [
        [{ instrument: "snare", velocity: 0.5 }],
        [{ instrument: "highTom", velocity: 0.62 }],
        [],
        [{ instrument: "midTom", velocity: 0.76 }],
        [{ instrument: "lowTom", velocity: 0.84 }],
        [
          { instrument: "lowTom", velocity: 0.96 },
          { instrument: "kick", velocity: 0.9 },
        ],
      ],
    },
  },
];

const validation = validateFillLibrary(builtInFills);
if (!validation.success) {
  throw new Error(
    `Built-in fill library is invalid: ${validation.errors.join(" ")}`,
  );
}

export function toFillMeter(
  numerator: number,
  denominator: number,
): SupportedFillMeter | undefined {
  const meter = `${numerator}/${denominator}` as SupportedFillMeter;
  return supportedFillMeters.includes(meter) ? meter : undefined;
}

export function getCompatibleFills(
  category: PatternCategory,
  meter: SupportedFillMeter,
  subdivision: 8 | 16,
): FillArrangement[] {
  return builtInFills.filter(
    ({ compatibility, tail }) =>
      compatibility.categories.includes(category) &&
      compatibility.meters.includes(meter) &&
      tail[subdivision].length > 0,
  );
}
