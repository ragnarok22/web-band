import { getStepsPerBar } from "@/lib/musical-time";
import type {
  StrummingPatternInput,
  StrummingPatternStepInput,
} from "@/stores/strumming-pattern-store";
import type { TimeSignature } from "@/types/pattern";
import type { StrummingPattern } from "@/types/practice";

function createDefaultStep(
  index: number,
  timeSignature: TimeSignature,
  subdivision: 8 | 16,
): StrummingPatternStepInput {
  const stepsPerBeat = subdivision / timeSignature.denominator;
  return {
    ...(index === 0 ? { accent: true } : {}),
    action: index % stepsPerBeat === 0 ? "down" : "hold",
  };
}

export function createDefaultStrummingSteps(
  timeSignature: TimeSignature,
  subdivision: 8 | 16,
): StrummingPatternStepInput[] {
  return Array.from(
    { length: getStepsPerBar(timeSignature, subdivision) },
    (_, index) => createDefaultStep(index, timeSignature, subdivision),
  );
}

export function createStrummingPatternDraft(
  timeSignature: TimeSignature,
  pattern?: StrummingPattern,
): StrummingPatternInput {
  return pattern
    ? {
        name: pattern.name,
        steps: pattern.steps.map(({ accent, action }) => ({ accent, action })),
        subdivision: pattern.subdivision,
        timeSignature: structuredClone(pattern.timeSignature),
      }
    : {
        name: "",
        steps: createDefaultStrummingSteps(timeSignature, 8),
        subdivision: 8,
        timeSignature: structuredClone(timeSignature),
      };
}

export function resizeStrummingSteps(
  steps: StrummingPatternStepInput[],
  previousSubdivision: 8 | 16,
  nextSubdivision: 8 | 16,
  timeSignature: TimeSignature,
): StrummingPatternStepInput[] {
  return Array.from(
    { length: getStepsPerBar(timeSignature, nextSubdivision) },
    (_, index) => {
      const sourceIndex = index * (previousSubdivision / nextSubdivision);
      const source = Number.isInteger(sourceIndex)
        ? steps[sourceIndex]
        : undefined;
      return source
        ? structuredClone(source)
        : createDefaultStep(index, timeSignature, nextSubdivision);
    },
  );
}
