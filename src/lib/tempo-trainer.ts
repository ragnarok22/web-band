import type {
  TempoTrainerConfiguration,
  TempoTrainerPosition,
} from "@/types/practice";

export interface TempoTrainerProgress {
  completedMeasures: number;
  elapsedSeconds: number;
  latestMeasureBoundarySeconds: number;
}

const MAX_SECONDS_THRESHOLD_EPSILON = 1e-9;

function getCompletedSecondIntervals(
  boundarySeconds: number,
  intervalSeconds: number,
): number {
  const epsilon = Math.min(
    MAX_SECONDS_THRESHOLD_EPSILON,
    Number.EPSILON * 32 * Math.max(1, boundarySeconds, intervalSeconds),
  );
  return Math.floor((boundarySeconds + epsilon) / intervalSeconds);
}

function assertProgress(progress: TempoTrainerProgress): void {
  if (
    !Number.isInteger(progress.completedMeasures) ||
    progress.completedMeasures < 0 ||
    !Number.isFinite(progress.elapsedSeconds) ||
    progress.elapsedSeconds < 0 ||
    !Number.isFinite(progress.latestMeasureBoundarySeconds) ||
    progress.latestMeasureBoundarySeconds < 0 ||
    progress.latestMeasureBoundarySeconds > progress.elapsedSeconds
  ) {
    throw new RangeError("Tempo trainer progress is invalid.");
  }
}

function getRequiredIntervals(
  configuration: TempoTrainerConfiguration,
): number {
  return Math.ceil(
    Math.abs(configuration.endBpm - configuration.startBpm) /
      configuration.increment,
  );
}

export function getTempoTrainerPosition(
  configuration: TempoTrainerConfiguration,
  progress: TempoTrainerProgress,
): TempoTrainerPosition {
  assertProgress(progress);

  const rawCompletedIntervals =
    configuration.interval.type === "measures"
      ? Math.floor(progress.completedMeasures / configuration.interval.measures)
      : getCompletedSecondIntervals(
          progress.latestMeasureBoundarySeconds,
          configuration.interval.seconds,
        );
  const requiredIntervals = getRequiredIntervals(configuration);
  const completedIntervals = Math.min(rawCompletedIntervals, requiredIntervals);
  const direction = Math.sign(configuration.endBpm - configuration.startBpm);
  const candidateBpm =
    configuration.startBpm +
    direction * configuration.increment * completedIntervals;
  const currentBpm =
    direction > 0
      ? Math.min(candidateBpm, configuration.endBpm)
      : direction < 0
        ? Math.max(candidateBpm, configuration.endBpm)
        : configuration.endBpm;
  const isAtTarget = currentBpm === configuration.endBpm;
  const nextCandidate = currentBpm + direction * configuration.increment;
  const nextBpm = isAtTarget
    ? null
    : direction > 0
      ? Math.min(nextCandidate, configuration.endBpm)
      : Math.max(nextCandidate, configuration.endBpm);
  const totalChange = Math.abs(configuration.endBpm - configuration.startBpm);
  const progressAmount =
    totalChange === 0
      ? 1
      : Math.abs(currentBpm - configuration.startBpm) / totalChange;

  return {
    completedIntervals,
    currentBpm,
    isAtTarget,
    measuresUntilChange:
      isAtTarget || configuration.interval.type !== "measures"
        ? null
        : configuration.interval.measures -
          (progress.completedMeasures % configuration.interval.measures),
    nextBpm,
    progress: progressAmount,
    secondsUntilChange:
      isAtTarget || configuration.interval.type !== "seconds"
        ? null
        : Math.max(
            0,
            (completedIntervals + 1) * configuration.interval.seconds -
              progress.elapsedSeconds,
          ),
    shouldStop: isAtTarget && configuration.stopAtTarget,
  };
}

export function getTempoTrainerStopBpm(
  configuration: TempoTrainerConfiguration,
  position: TempoTrainerPosition,
): number {
  return configuration.resetToStartingBpmOnStop
    ? configuration.startBpm
    : position.currentBpm;
}
