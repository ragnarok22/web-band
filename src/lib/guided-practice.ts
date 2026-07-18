import type { TimeSignature } from "@/types/pattern";
import type {
  ChordStep,
  ChordTrainerConfiguration,
  ChordTrainerPosition,
  StrummingPattern,
  StrumPosition,
} from "@/types/practice";

function assertAbsoluteSixteenth(absoluteSixteenth: number): void {
  if (!Number.isInteger(absoluteSixteenth) || absoluteSixteenth < 0) {
    throw new RangeError(
      "Absolute sixteenth position must be a non-negative integer.",
    );
  }
}

function getSixteenthsPerBeat(timeSignature: TimeSignature): number {
  return 16 / timeSignature.denominator;
}

function getSixteenthsPerMeasure(timeSignature: TimeSignature): number {
  return timeSignature.numerator * getSixteenthsPerBeat(timeSignature);
}

export function getChordStepSixteenths(
  step: ChordStep,
  timeSignature: TimeSignature,
): number {
  return (
    step.duration *
    (step.durationUnit === "beats"
      ? getSixteenthsPerBeat(timeSignature)
      : getSixteenthsPerMeasure(timeSignature))
  );
}

export function getChordTrainerPosition(
  configuration: ChordTrainerConfiguration,
  timeSignature: TimeSignature,
  absoluteSixteenth: number,
): ChordTrainerPosition {
  assertAbsoluteSixteenth(absoluteSixteenth);

  const stepLengths = configuration.progression.steps.map((step) =>
    getChordStepSixteenths(step, timeSignature),
  );
  const progressionLength = stepLengths.reduce(
    (total, length) => total + length,
    0,
  );
  const hasCompleted =
    !configuration.repeat && absoluteSixteenth >= progressionLength;

  if (hasCompleted) {
    return {
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
    };
  }

  const cycle = configuration.repeat
    ? Math.floor(absoluteSixteenth / progressionLength)
    : 0;
  const positionInProgression = configuration.repeat
    ? absoluteSixteenth % progressionLength
    : absoluteSixteenth;
  let stepStart = 0;
  let currentStepIndex = 0;

  for (let index = 0; index < stepLengths.length; index += 1) {
    const stepLength = stepLengths[index] ?? 0;
    if (positionInProgression < stepStart + stepLength) {
      currentStepIndex = index;
      break;
    }
    stepStart += stepLength;
  }

  const currentStep = configuration.progression.steps[currentStepIndex];
  const currentStepLength = stepLengths[currentStepIndex] ?? 0;
  if (!currentStep || currentStepLength <= 0) {
    throw new RangeError("Chord trainer configuration has no playable steps.");
  }

  const directNextStep = configuration.progression.steps[currentStepIndex + 1];
  const nextStep =
    directNextStep ??
    (configuration.repeat ? configuration.progression.steps[0] : undefined);
  const sixteenthsIntoStep = positionInProgression - stepStart;
  const sixteenthsRemaining = currentStepLength - sixteenthsIntoStep;

  return {
    countdown: configuration.showCountdown
      ? Math.ceil(sixteenthsRemaining / getSixteenthsPerBeat(timeSignature))
      : null,
    currentChord: currentStep.chord,
    currentStepId: currentStep.id,
    currentStepIndex,
    cycle,
    isComplete: false,
    nextChord: nextStep?.chord ?? null,
    nextStepId: nextStep?.id ?? null,
    sixteenthsIntoStep,
    sixteenthsRemaining,
  };
}

export function isStrummingPatternMeterCompatible(
  pattern: StrummingPattern,
  timeSignature: TimeSignature,
): boolean {
  return (
    pattern.timeSignature.numerator === timeSignature.numerator &&
    pattern.timeSignature.denominator === timeSignature.denominator
  );
}

export function getStrumPosition(
  pattern: StrummingPattern,
  absoluteSixteenth: number,
): StrumPosition {
  assertAbsoluteSixteenth(absoluteSixteenth);

  const sixteenthsPerStep = 16 / pattern.subdivision;
  const measureLength = getSixteenthsPerMeasure(pattern.timeSignature);
  const positionInMeasure = absoluteSixteenth % measureLength;
  const stepIndex = Math.floor(positionInMeasure / sixteenthsPerStep);
  const currentStep = pattern.steps[stepIndex];
  const nextStep = pattern.steps[(stepIndex + 1) % pattern.steps.length];

  if (!currentStep || !nextStep) {
    throw new RangeError("Strumming pattern has no step at this position.");
  }

  return {
    accent: currentStep.accent === true,
    currentAction: currentStep.action,
    currentStepId: currentStep.id,
    isStepBoundary: positionInMeasure % sixteenthsPerStep === 0,
    nextAction: nextStep.action,
    nextStepId: nextStep.id,
    stepIndex,
  };
}
