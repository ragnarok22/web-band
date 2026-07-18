import type {
  StrumAction,
  StrummingPattern,
  StrumStep,
} from "@/types/practice";

type StrumStepSeed = StrumAction | { action: StrumAction; accent: true };

function createSteps(
  patternId: string,
  seeds: readonly StrumStepSeed[],
): StrumStep[] {
  return seeds.map((seed, subdivisionIndex) => ({
    accent: typeof seed === "string" ? undefined : seed.accent,
    action: typeof seed === "string" ? seed : seed.action,
    id: `${patternId}-${subdivisionIndex + 1}`,
    subdivisionIndex,
  }));
}

function createPattern(
  id: string,
  name: string,
  numerator: number,
  denominator: number,
  subdivision: 8 | 16,
  seeds: readonly StrumStepSeed[],
): StrummingPattern {
  return {
    id,
    isBuiltIn: true,
    name,
    steps: createSteps(id, seeds),
    subdivision,
    timeSignature: { denominator, numerator },
  };
}

export const quarterDownstrokesPattern = createPattern(
  "quarter-downstrokes",
  "Quarter-Note Downstrokes",
  4,
  4,
  8,
  [
    { accent: true, action: "down" },
    "hold",
    "down",
    "hold",
    "down",
    "hold",
    "down",
    "hold",
  ],
);

export const eighthDownstrokesPattern = createPattern(
  "eighth-downstrokes",
  "Eighth-Note Downstrokes",
  4,
  4,
  8,
  [
    { accent: true, action: "down" },
    "down",
    "down",
    "down",
    "down",
    "down",
    "down",
    "down",
  ],
);

export const downDownUpUpDownUpPattern = createPattern(
  "down-down-up-up-down-up",
  "Down, Down-Up, Up-Down-Up",
  4,
  4,
  8,
  [
    { accent: true, action: "down" },
    "rest",
    "down",
    "up",
    "rest",
    "up",
    "down",
    "up",
  ],
);

export const balladPattern = createPattern(
  "beginner-ballad",
  "Beginner Ballad",
  4,
  4,
  16,
  [
    { accent: true, action: "down" },
    "hold",
    "rest",
    "hold",
    "down",
    "hold",
    "up",
    "hold",
    "rest",
    "hold",
    "up",
    "hold",
    "down",
    "hold",
    "up",
    "hold",
  ],
);

export const basicPopPattern = createPattern(
  "basic-pop-strumming",
  "Basic Pop",
  4,
  4,
  16,
  [
    { accent: true, action: "down" },
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
  ],
);

export const basicThreeFourPattern = createPattern(
  "basic-three-four",
  "Basic 3/4",
  3,
  4,
  8,
  [{ accent: true, action: "down" }, "hold", "down", "up", "down", "up"],
);

export const basicSixEightPattern = createPattern(
  "basic-six-eight",
  "Basic 6/8",
  6,
  8,
  8,
  [{ accent: true, action: "down" }, "hold", "rest", "up", "down", "up"],
);

export const builtInStrummingPatterns: readonly StrummingPattern[] = [
  quarterDownstrokesPattern,
  eighthDownstrokesPattern,
  downDownUpUpDownUpPattern,
  balladPattern,
  basicPopPattern,
  basicThreeFourPattern,
  basicSixEightPattern,
];

export function getBuiltInStrummingPattern(
  patternId: string,
): StrummingPattern | undefined {
  return builtInStrummingPatterns.find((pattern) => pattern.id === patternId);
}
