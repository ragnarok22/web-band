import type { TimeSignature } from "@/types/pattern";
import type {
  MetronomeConfiguration,
  MetronomePosition,
  MetronomeSubdivision,
} from "@/types/practice";

export const metronomeMeters = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 5, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 12, denominator: 8 },
] as const;
export const metronomeSubdivisions = [1, 2, 3, 4] as const;

export function getMetronomeMeter(meter: TimeSignature, ppq = 192) {
  const compound = meter.denominator === 8;
  const pulsesPerMeasure = compound ? meter.numerator / 3 : meter.numerator;
  const ticksPerPulse = ppq * (compound ? 1.5 : 1);
  return {
    compound,
    pulsesPerMeasure,
    ticksPerPulse,
    ticksPerMeasure: ticksPerPulse * pulsesPerMeasure,
  };
}

export function toMetronomeTransportBpm(
  bpm: number,
  meter: TimeSignature,
): number {
  return bpm * (getMetronomeMeter(meter).compound ? 1.5 : 1);
}

export function createDefaultMetronomeConfiguration(): MetronomeConfiguration {
  return {
    timeSignature: { numerator: 4, denominator: 4 },
    subdivision: 1,
    accentPattern: [true, false, false, false],
    subdivisionAudioMode: "pulse-guide",
    metronomeVolume: 0.8,
    subdivisionVolume: 0.45,
    accentIntensity: 0.7,
    trainingMode: "manual",
    measuresPerStage: 4,
    endBehavior: "repeat",
  };
}

export function getSubdivisionLabel(
  count: number,
  meter: TimeSignature,
): string {
  const simple = [
    "Quarter notes",
    "Eighth notes",
    "Eighth-note triplets",
    "Sixteenth notes",
  ];
  const compound = [
    "Dotted quarter notes",
    "Dotted eighth notes",
    "Eighth notes",
    "Dotted sixteenth notes",
  ];
  return (
    (getMetronomeMeter(meter).compound ? compound : simple)[count - 1] ??
    `${count} attacks per pulse`
  );
}

export function getMetronomeCountLabels(
  count: number,
  beat: number,
  meter: TimeSignature,
): string[] {
  if (getMetronomeMeter(meter).compound && count === 3)
    return [String(beat + 1), "la", "li"];
  return [
    String(beat + 1),
    ...(count === 2
      ? ["&"]
      : count === 3
        ? ["trip", "let"]
        : count === 4
          ? ["e", "&", "a"]
          : []),
  ];
}

/** Pure transport-position arithmetic: no wall clock and no mutable progression counter. */
export function getMetronomePosition(
  config: MetronomeConfiguration,
  transportTick: number,
  countInMeasures: number,
  ppq: number,
): MetronomePosition | null {
  const { ticksPerMeasure, ticksPerPulse } = getMetronomeMeter(
    config.timeSignature,
    ppq,
  );
  const countInTicks = countInMeasures * ticksPerMeasure;
  const countingIn = transportTick < countInTicks;
  const tick = countingIn ? transportTick : transportTick - countInTicks;
  const measureIndex = Math.floor(tick / ticksPerMeasure);
  const progressive = !countingIn && config.trainingMode === "progressive";
  const stageOrdinal = progressive
    ? Math.floor(measureIndex / config.measuresPerStage)
    : 0;
  if (progressive && stageOrdinal >= 4 && config.endBehavior === "stop")
    return null;
  const stage =
    config.endBehavior === "repeat"
      ? stageOrdinal % 4
      : Math.min(3, stageOrdinal);
  const subdivision: MetronomeSubdivision = countingIn
    ? 1
    : progressive
      ? metronomeSubdivisions[stage]!
      : config.subdivision;
  const beat = Math.floor((tick % ticksPerMeasure) / ticksPerPulse);
  const subdivisionIndex = Math.floor(
    ((tick % ticksPerPulse) * subdivision) / ticksPerPulse + 1e-8,
  );
  return {
    phase: countingIn ? "count-in" : "metronome",
    measure: measureIndex + 1,
    beat,
    subdivision,
    subdivisionIndex,
    stage,
    stageMeasure: progressive
      ? Math.min(
          config.measuresPerStage,
          measureIndex - stageOrdinal * config.measuresPerStage + 1,
        )
      : 1,
    isAccent: config.accentPattern[beat] ?? beat === 0,
  };
}
