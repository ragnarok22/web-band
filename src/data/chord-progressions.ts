import type { ChordProgression, ChordStep } from "@/types/practice";

function measureStep(id: string, chord: string): ChordStep {
  return {
    chord,
    duration: 1,
    durationUnit: "measures",
    id,
  };
}

export const gDEmCProgression: ChordProgression = {
  id: "g-d-em-c",
  isBuiltIn: true,
  name: "G - D - Em - C",
  steps: [
    measureStep("g-d-em-c-g", "G"),
    measureStep("g-d-em-c-d", "D"),
    measureStep("g-d-em-c-em", "Em"),
    measureStep("g-d-em-c-c", "C"),
  ],
};

export const cGAmFProgression: ChordProgression = {
  id: "c-g-am-f",
  isBuiltIn: true,
  name: "C - G - Am - F",
  steps: [
    measureStep("c-g-am-f-c", "C"),
    measureStep("c-g-am-f-g", "G"),
    measureStep("c-g-am-f-am", "Am"),
    measureStep("c-g-am-f-f", "F"),
  ],
};

export const amFCGProgression: ChordProgression = {
  id: "am-f-c-g",
  isBuiltIn: true,
  name: "Am - F - C - G",
  steps: [
    measureStep("am-f-c-g-am", "Am"),
    measureStep("am-f-c-g-f", "F"),
    measureStep("am-f-c-g-c", "C"),
    measureStep("am-f-c-g-g", "G"),
  ],
};

const bluesChords = [
  "A7",
  "A7",
  "A7",
  "A7",
  "D7",
  "D7",
  "A7",
  "A7",
  "E7",
  "D7",
  "A7",
  "E7",
] as const;

export const twelveBarBluesInA: ChordProgression = {
  id: "twelve-bar-blues-in-a",
  isBuiltIn: true,
  name: "12-Bar Blues in A",
  steps: bluesChords.map((chord, index) =>
    measureStep(`twelve-bar-blues-in-a-${index + 1}`, chord),
  ),
};

export const simpleOneFourFiveProgression: ChordProgression = {
  id: "simple-one-four-five-in-c",
  isBuiltIn: true,
  name: "Simple I-IV-V in C",
  steps: [
    measureStep("simple-one-four-five-in-c-c-1", "C"),
    measureStep("simple-one-four-five-in-c-f", "F"),
    measureStep("simple-one-four-five-in-c-g", "G"),
    measureStep("simple-one-four-five-in-c-c-2", "C"),
  ],
};

export const builtInChordProgressions: readonly ChordProgression[] = [
  gDEmCProgression,
  cGAmFProgression,
  amFCGProgression,
  twelveBarBluesInA,
  simpleOneFourFiveProgression,
];

export function getBuiltInChordProgression(
  progressionId: string,
): ChordProgression | undefined {
  return builtInChordProgressions.find(
    (progression) => progression.id === progressionId,
  );
}
