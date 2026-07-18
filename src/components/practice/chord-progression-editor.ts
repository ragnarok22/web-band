import type { ChordProgressionInput } from "@/stores/chord-progression-store";
import type { ChordProgression, ChordStep } from "@/types/practice";

export function createChordStep(chord = ""): ChordStep {
  return {
    chord,
    duration: 1,
    durationUnit: "measures",
    id: crypto.randomUUID(),
  };
}

export function createProgressionDraft(
  progression?: ChordProgression,
): ChordProgressionInput {
  return progression
    ? { name: progression.name, steps: structuredClone(progression.steps) }
    : { name: "", steps: [createChordStep()] };
}
