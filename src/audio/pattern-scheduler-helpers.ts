import { getGenericFillHits } from "@/audio/fill-generator";
import { getPatternStepCount, getStepsPerBar } from "@/lib/musical-time";
import { clampUnit } from "@/lib/mixer";
import type { DrumInstrument, DrumPattern } from "@/types/pattern";

export interface PlayableHit {
  instrument: DrumInstrument;
  probability?: number;
  timingOffset?: number;
  velocity: number;
}

export interface PlayablePatternStep {
  hits: PlayableHit[];
  stepInBar: number;
}

export function getPlayablePatternStep(
  pattern: DrumPattern,
  absoluteSixteenth: number,
  isFill: boolean,
  addPostFillCrash: boolean,
): PlayablePatternStep | null {
  const sixteenthsPerStep = 16 / pattern.subdivision;
  const patternLength = getPatternStepCount(pattern) * sixteenthsPerStep;
  const patternSixteenth = absoluteSixteenth % patternLength;
  if (patternSixteenth % sixteenthsPerStep !== 0) return null;

  const patternStep = patternSixteenth / sixteenthsPerStep;
  const stepInBar =
    patternStep % getStepsPerBar(pattern.timeSignature, pattern.subdivision);
  const patternHits: PlayableHit[] = pattern.hits.filter(
    (hit) => hit.step === patternStep,
  );
  const fillHits = isFill ? getGenericFillHits(pattern, stepInBar) : [];
  const hits = fillHits.length > 0 ? [...fillHits] : [...patternHits];

  if (addPostFillCrash && !hits.some((hit) => hit.instrument === "crash")) {
    hits.push({ instrument: "crash", velocity: 0.9 });
  }
  return { hits, stepInBar };
}

export function humanizeHit(
  hit: PlayableHit,
  isDownbeat: boolean,
  humanization: number,
  random: () => number,
): { timeOffset: number; velocity: number } {
  if (humanization === 0) {
    return { timeOffset: 0, velocity: hit.velocity };
  }

  const timeOffset = isDownbeat ? 0 : random() * 0.01 * humanization;
  const velocityOffset = (random() * 2 - 1) * 0.05 * humanization;
  return {
    timeOffset,
    velocity: clampUnit(hit.velocity + velocityOffset),
  };
}
