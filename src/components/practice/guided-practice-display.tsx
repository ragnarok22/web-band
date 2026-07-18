"use client";

import { strumActionDetails } from "@/components/practice/strum-action-details";
import { useGuidanceSnapshot } from "@/hooks/use-guidance-snapshot";
import { getChordTrainerPosition } from "@/lib/guided-practice";
import type { TimeSignature } from "@/types/pattern";
import type {
  GuidedPracticeConfiguration,
  StrumAction,
  StrumPosition,
  TempoTrainerPosition,
} from "@/types/practice";

interface GuidedPracticeDisplayProps {
  configuration: GuidedPracticeConfiguration;
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

function getChordFallback(
  configuration: Extract<GuidedPracticeConfiguration, { mode: "chords" }>,
  timeSignature: TimeSignature,
) {
  return getChordTrainerPosition(configuration.chordTrainer, timeSignature, 0);
}

function getStrumFallback(
  configuration: Extract<GuidedPracticeConfiguration, { mode: "strumming" }>,
): StrumPosition | null {
  const current = configuration.strummingPattern.steps[0];
  const next = configuration.strummingPattern.steps[1] ?? current;
  return current && next
    ? {
        accent: current.accent === true,
        currentAction: current.action,
        currentStepId: current.id,
        isStepBoundary: true,
        nextAction: next.action,
        nextStepId: next.id,
        stepIndex: 0,
      }
    : null;
}

function StrumCue({ action, label }: { action: StrumAction; label: string }) {
  const details = strumActionDetails[action];
  return (
    <div className="border-border bg-background rounded-xl border p-3 text-center">
      <p className="text-muted text-[0.65rem] font-extrabold tracking-wider uppercase">
        {label}
      </p>
      <span
        aria-hidden="true"
        className="text-accent mt-1 block text-4xl font-black"
      >
        {details.symbol}
      </span>
      <p className="text-foreground mt-1 text-sm font-black">{details.label}</p>
    </div>
  );
}

export function GuidedPracticeDisplay({
  configuration,
  timeSignature,
}: GuidedPracticeDisplayProps) {
  const snapshot = useGuidanceSnapshot();
  const frame = snapshot?.mode === configuration.mode ? snapshot : null;
  const measure = frame?.measure ?? 1;

  if (configuration.mode === "drums") {
    return (
      <section
        aria-labelledby="guided-display-heading"
        className="border-border bg-surface rounded-2xl border p-4 text-center sm:p-6"
      >
        <p className="text-muted text-xs font-extrabold tracking-[0.16em] uppercase">
          Measure {measure}
        </p>
        <h2
          className="text-foreground mt-2 text-2xl font-black"
          id="guided-display-heading"
        >
          Follow the groove
        </h2>
        <p className="text-muted mt-2 text-sm">
          Drum mode has no added trainer cues.
        </p>
      </section>
    );
  }

  if (configuration.mode === "tempoTrainer") {
    const position =
      frame?.mode === "tempoTrainer"
        ? frame.position
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
        <div
          aria-atomic="true"
          aria-live="polite"
          className="grid grid-cols-2 gap-3"
        >
          <div className="border-accent/40 bg-accent/8 rounded-xl border p-3 text-center">
            <p className="text-muted text-xs font-extrabold uppercase">
              Current tempo
            </p>
            <p
              className="text-accent mt-1 text-4xl font-black tabular-nums"
              data-testid="trainer-current-bpm"
            >
              {position.currentBpm}
              <span className="ml-1 text-xs tracking-wider">BPM</span>
            </p>
          </div>
          <div className="border-border bg-background rounded-xl border p-3 text-center">
            <p className="text-muted text-xs font-extrabold uppercase">
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
          <span className="text-muted">{changeText}</span>
          <span className="text-muted-strong tabular-nums">{percent}%</span>
        </div>
        <progress
          aria-label="Overall tempo progress"
          aria-valuetext={`${percent} percent toward target tempo`}
          className="accent-accent mt-2 h-2 w-full"
          max={100}
          value={percent}
        />
        <h2 className="sr-only" id="guided-display-heading">
          Tempo trainer guidance
        </h2>
      </section>
    );
  }

  if (configuration.mode === "chords") {
    const position =
      frame?.mode === "chords"
        ? frame.position
        : getChordFallback(configuration, timeSignature);
    return (
      <section
        aria-labelledby="guided-display-heading"
        className="border-border bg-surface rounded-2xl border p-4 sm:p-6"
      >
        <div
          aria-atomic="true"
          aria-live="polite"
          className="grid grid-cols-2 gap-3"
        >
          <div className="border-accent/40 bg-accent/8 rounded-xl border p-3 text-center">
            <p className="text-muted text-xs font-extrabold uppercase">
              Current chord
            </p>
            <p className="text-accent mt-1 truncate text-4xl font-black">
              {position.currentChord ?? "Complete"}
            </p>
          </div>
          <div className="border-border bg-background rounded-xl border p-3 text-center">
            <p className="text-muted text-xs font-extrabold uppercase">
              Next chord
            </p>
            <p className="text-foreground mt-1 truncate text-4xl font-black">
              {position.nextChord ?? "Finish"}
            </p>
          </div>
        </div>
        <p className="text-muted mt-3 text-center text-sm font-bold">
          {position.countdown === null
            ? `Measure ${measure}`
            : `Change in ${position.countdown} ${position.countdown === 1 ? "beat" : "beats"}`}
        </p>
        <h2 className="sr-only" id="guided-display-heading">
          Chord trainer guidance
        </h2>
      </section>
    );
  }

  const position =
    frame?.mode === "strumming"
      ? frame.position
      : getStrumFallback(configuration);
  return (
    <section
      aria-labelledby="guided-display-heading"
      className="border-border bg-surface rounded-2xl border p-4 sm:p-6"
    >
      <div className="grid grid-cols-2 gap-3">
        {position ? (
          <>
            <StrumCue action={position.currentAction} label="Current strum" />
            <StrumCue action={position.nextAction} label="Next strum" />
          </>
        ) : (
          <p className="text-muted col-span-2 text-center">
            No strum actions available.
          </p>
        )}
      </div>
      <p className="text-muted mt-3 text-center text-sm font-bold">
        Step {(position?.stepIndex ?? 0) + 1} of{" "}
        {configuration.strummingPattern.steps.length}
        {position?.accent ? " - Accent" : ""}
      </p>
      <h2 className="sr-only" id="guided-display-heading">
        Strumming trainer guidance
      </h2>
    </section>
  );
}
