"use client";

import { StrummingPracticeView } from "@/components/practice/strumming-practice-view";
import { ChordPracticeView } from "@/components/practice/chord-practice-view";
import { useGuidanceSnapshot } from "@/hooks/use-guidance-snapshot";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";
import type { BeatFlashIntensity } from "@/types/persistence";
import type {
  GuidanceFrame,
  GuidedPracticeConfiguration,
  TempoTrainerPosition,
} from "@/types/practice";

interface GuidedPracticeDisplayProps {
  embedded?: boolean;
  configuration: GuidedPracticeConfiguration;
  countInMeasures?: CountInMeasures;
  intensity?: BeatFlashIntensity;
  status?: AudioEngineStatus;
  timeSignature: TimeSignature;
}

function getTempoFallback(
  configuration: Extract<GuidedPracticeConfiguration, { mode: "tempoTrainer" }>,
): TempoTrainerPosition {
  const { endBpm, increment, interval, startBpm, stopAtTarget } =
    configuration.tempoTrainer;
  const direction = Math.sign(endBpm - startBpm);
  const nextCandidate = startBpm + direction * increment;
  const nextBpm =
    direction === 0
      ? null
      : direction > 0
        ? Math.min(nextCandidate, endBpm)
        : Math.max(nextCandidate, endBpm);
  return {
    completedIntervals: 0,
    currentBpm: startBpm,
    isAtTarget: startBpm === endBpm,
    measuresUntilChange:
      interval.type === "measures" ? interval.measures : null,
    nextBpm,
    progress: startBpm === endBpm ? 1 : 0,
    secondsUntilChange: interval.type === "seconds" ? interval.seconds : null,
    shouldStop: startBpm === endBpm && stopAtTarget,
  };
}

export function GuidedPracticeDisplay({
  embedded = false,
  configuration,
  countInMeasures = 0,
  intensity = "standard",
  status = "stopped",
  timeSignature,
}: GuidedPracticeDisplayProps) {
  const snapshot = useGuidanceSnapshot();

  return (
    <div
      className={
        embedded
          ? "guided-display--embedded border-border mx-4 border-t py-3 sm:mx-6"
          : undefined
      }
    >
      <ModeGuidance
        configuration={configuration}
        countInMeasures={countInMeasures}
        intensity={intensity}
        snapshot={snapshot}
        status={status}
        timeSignature={timeSignature}
      />
    </div>
  );
}

function ModeGuidance({
  configuration,
  countInMeasures,
  intensity,
  snapshot,
  status,
  timeSignature,
}: GuidedPracticeDisplayProps & { snapshot: GuidanceFrame | null }) {
  switch (configuration.mode) {
    case "drums":
      return <DrumGuidance snapshot={snapshot} />;
    case "tempoTrainer":
      return (
        <TempoGuidance configuration={configuration} snapshot={snapshot} />
      );
    case "chords":
      return (
        <ChordPracticeView
          configuration={configuration.chordTrainer}
          snapshot={snapshot}
          status={status}
          timeSignature={timeSignature}
        />
      );
    case "strumming":
      return (
        <StrummingPracticeView
          countInMeasures={countInMeasures}
          intensity={intensity}
          pattern={configuration.strummingPattern}
          snapshot={snapshot}
          status={status}
          timeSignature={timeSignature}
        />
      );
  }
}

function DrumGuidance({ snapshot }: { snapshot: GuidanceFrame | null }) {
  const measure = snapshot?.mode === "drums" ? snapshot.measure : 1;

  return (
    <section
      aria-labelledby="guided-display-heading"
      className="border-border bg-surface rounded-2xl border p-4 text-center sm:p-6"
    >
      <p className="text-muted-foreground text-xs font-extrabold tracking-[0.16em] uppercase">
        Measure {measure}
      </p>
      <h2
        className="text-foreground mt-2 text-2xl font-black"
        id="guided-display-heading"
      >
        Follow the groove
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Drum mode has no added trainer cues.
      </p>
    </section>
  );
}

function TempoGuidance({
  configuration,
  snapshot,
}: {
  configuration: Extract<GuidedPracticeConfiguration, { mode: "tempoTrainer" }>;
  snapshot: GuidanceFrame | null;
}) {
  const position =
    snapshot?.mode === "tempoTrainer"
      ? snapshot.position
      : getTempoFallback(configuration);
  const percent = Math.round(position.progress * 100);
  const changeText =
    position.measuresUntilChange !== null
      ? `${position.measuresUntilChange} measures until the next change`
      : position.secondsUntilChange !== null
        ? `${Math.ceil(position.secondsUntilChange)} seconds until the next change`
        : "Target tempo reached";
  return (
    <section
      aria-labelledby="guided-display-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-6"
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="border-primary/40 bg-primary/8 rounded-xl border p-3 text-center">
          <p className="text-muted-foreground text-xs font-extrabold uppercase">
            Current tempo
          </p>
          <p
            className="text-primary mt-1 text-4xl font-black tabular-nums"
            data-testid="trainer-current-bpm"
          >
            {position.currentBpm}
            <span className="ml-1 text-xs tracking-wider">BPM</span>
          </p>
        </div>
        <div className="border-border bg-background rounded-xl border p-3 text-center">
          <p className="text-muted-foreground text-xs font-extrabold uppercase">
            Next tempo
          </p>
          <p className="text-foreground mt-1 text-4xl font-black tabular-nums">
            {position.nextBpm ?? "Target"}
            {position.nextBpm !== null ? (
              <span className="ml-1 text-xs tracking-wider">BPM</span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold">
        <span className="text-muted-foreground">{changeText}</span>
        <span className="text-muted-strong tabular-nums">{percent}%</span>
      </div>
      <progress
        aria-label="Overall tempo progress"
        aria-valuetext={`${percent} percent toward target tempo`}
        className="accent-primary mt-2 h-2 w-full"
        max={100}
        value={percent}
      />
      <h2 className="sr-only" id="guided-display-heading">
        Tempo trainer guidance
      </h2>
    </section>
  );
}
