import { getMetronomeMeter, metronomeMeters } from "@/lib/metronome";
import type { MetronomeConfiguration } from "@/types/practice";

export function isMetronomeConfiguration(
  value: unknown,
): value is MetronomeConfiguration {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  const meter = config.timeSignature;
  if (!meter || typeof meter !== "object" || Array.isArray(meter)) return false;
  const { numerator, denominator } = meter as Record<string, unknown>;
  if (
    !metronomeMeters.some(
      (supported) =>
        supported.numerator === numerator &&
        supported.denominator === denominator,
    )
  )
    return false;
  const pulseCount = getMetronomeMeter({
    numerator: numerator as number,
    denominator: denominator as number,
  }).pulsesPerMeasure;
  const unit = (level: unknown) =>
    typeof level === "number" &&
    Number.isFinite(level) &&
    level >= 0 &&
    level <= 1;
  return (
    [1, 2, 3, 4].includes(config.subdivision as number) &&
    Array.isArray(config.accentPattern) &&
    config.accentPattern.length === pulseCount &&
    config.accentPattern.every((accent) => typeof accent === "boolean") &&
    ["pulse-only", "pulse-guide"].includes(
      config.subdivisionAudioMode as string,
    ) &&
    unit(config.metronomeVolume) &&
    unit(config.subdivisionVolume) &&
    unit(config.accentIntensity) &&
    ["manual", "progressive"].includes(config.trainingMode as string) &&
    [2, 4, 8, 16].includes(config.measuresPerStage as number) &&
    ["repeat", "hold", "stop"].includes(config.endBehavior as string)
  );
}
