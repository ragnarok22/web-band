"use client";

import { useSyncExternalStore } from "react";

import { visualTimeline } from "@/audio/visual-timeline";
import { strumActionDetails } from "@/components/practice/strum-action-details";
import styles from "@/components/practice/strumming-practice.module.css";
import { StrummingSequence } from "@/components/practice/strumming-sequence";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getStrumPosition,
  isStrummingPatternMeterCompatible,
} from "@/lib/guided-practice";
import type {
  AudioEngineStatus,
  CountInMeasures,
  CountInVisualFrame,
} from "@/types/audio";
import type { TimeSignature } from "@/types/pattern";
import type { BeatFlashIntensity } from "@/types/persistence";
import type {
  GuidanceFrame,
  StrumAction,
  StrummingPattern,
  StrumPosition,
} from "@/types/practice";

interface StrummingPracticeViewProps {
  countInMeasures?: CountInMeasures;
  intensity?: BeatFlashIntensity;
  pattern: StrummingPattern;
  snapshot: GuidanceFrame | null;
  status?: AudioEngineStatus;
  timeSignature: TimeSignature;
}

function subscribeCountIn(onChange: () => void) {
  return visualTimeline.subscribe(onChange);
}

function getCountInSnapshot() {
  const frame = visualTimeline.getSnapshot();
  return frame?.phase === "count-in" ? frame : null;
}

function getServerCountInSnapshot() {
  return null;
}

function getMatchingCountIn(
  frame: CountInVisualFrame | null,
  timeSignature: TimeSignature,
  measures: CountInMeasures,
) {
  return frame &&
    frame.beat >= 0 &&
    frame.beat < timeSignature.numerator &&
    frame.measure >= 1 &&
    frame.measure <= measures
    ? frame
    : null;
}

function getMatchingPosition(
  pattern: StrummingPattern,
  snapshot: GuidanceFrame | null,
  timeSignature: TimeSignature,
) {
  if (
    snapshot?.mode !== "strumming" ||
    !isStrummingPatternMeterCompatible(pattern, timeSignature) ||
    pattern.steps.length === 0 ||
    !Number.isInteger(snapshot.absoluteSixteenth) ||
    snapshot.absoluteSixteenth < 0
  ) {
    return null;
  }

  const expected = getStrumPosition(pattern, snapshot.absoluteSixteenth);
  const actual = snapshot.position;
  return expected.stepIndex === actual.stepIndex &&
    expected.currentStepId === actual.currentStepId &&
    expected.currentAction === actual.currentAction &&
    expected.nextStepId === actual.nextStepId &&
    expected.nextAction === actual.nextAction &&
    expected.accent === actual.accent
    ? actual
    : null;
}

function ActionCue({
  accent = false,
  action,
  next = false,
}: {
  accent?: boolean;
  action: StrumAction;
  next?: boolean;
}) {
  const details = strumActionDetails[action];
  const label = next ? "Next action" : "Current action";
  return (
    <div
      aria-label={label}
      className={next ? styles.nextCue : styles.currentCue}
      role="group"
    >
      {!next ? <p className={styles.cueLabel}>{label}</p> : null}
      <p className={styles.cueAction}>
        {next ? <span className={styles.nextLabel}>Next:</span> : null}
        <span aria-hidden="true" className={styles.cueSymbol}>
          {details.symbol}
        </span>
        <span>{details.label}</span>
      </p>
      <div className={styles.accentSlot}>
        {accent ? (
          <span className={styles.cueAccent}>
            <span aria-hidden="true">&gt; </span>Accent
          </span>
        ) : null}
      </div>
      {!next ? <p className={styles.guidance}>{details.guidance}</p> : null}
    </div>
  );
}

function SymbolHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={<Button className="min-h-11" size="sm" variant="ghost" />}
      >
        Symbol help
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Strumming symbols</PopoverTitle>
        <PopoverDescription className="mt-1">
          Keep a steady hand motion through every position.
        </PopoverDescription>
        <dl className="mt-3 space-y-3">
          {Object.entries(strumActionDetails).map(([action, details]) => (
            <div key={action}>
              <dt className="text-foreground flex items-center gap-2 text-sm font-extrabold">
                <span aria-hidden="true" className="w-5 text-center text-xl">
                  {details.symbol}
                </span>
                {details.label}
              </dt>
              <dd className="text-muted-strong ml-7 text-xs leading-relaxed">
                {details.guidance}
              </dd>
            </div>
          ))}
          <div>
            <dt className="text-foreground text-sm font-extrabold">
              &gt; Accent
            </dt>
            <dd className="text-muted-strong mt-1 text-xs leading-relaxed">
              Play this action a little more strongly.
            </dd>
          </div>
        </dl>
      </PopoverContent>
    </Popover>
  );
}

function StrummingActionCues({
  countIn,
  countInMeasures,
  isCountingIn,
  nextAccent,
  position,
}: {
  countIn: CountInVisualFrame | null;
  countInMeasures: CountInMeasures;
  isCountingIn: boolean;
  nextAccent?: boolean;
  position: StrumPosition | null;
}) {
  if (!position) {
    return (
      <p className="text-muted-foreground text-center text-sm">
        No strum actions available.
      </p>
    );
  }
  return (
    <div className={styles.cues}>
      {isCountingIn ? (
        <div
          aria-label="Current action"
          className={styles.currentCue}
          role="group"
        >
          <p className={styles.cueLabel}>Count in</p>
          <p className={styles.cueAction}>
            {countIn ? countIn.beat + 1 : "Ready"}
          </p>
          <div aria-hidden="true" className={styles.accentSlot} />
          <p className={styles.guidance}>
            Listen, then start on 1.
            {countIn && countInMeasures > 1
              ? ` Bar ${countIn.measure} of ${countInMeasures}.`
              : ""}
          </p>
        </div>
      ) : (
        <ActionCue accent={position.accent} action={position.currentAction} />
      )}
      <ActionCue
        accent={isCountingIn ? position.accent : nextAccent}
        action={isCountingIn ? position.currentAction : position.nextAction}
        next
      />
    </div>
  );
}

export function StrummingPracticeView({
  countInMeasures = 0,
  intensity = "standard",
  pattern,
  snapshot,
  status = "stopped",
  timeSignature,
}: StrummingPracticeViewProps) {
  const countInSnapshot = useSyncExternalStore(
    subscribeCountIn,
    getCountInSnapshot,
    getServerCountInSnapshot,
  );
  const isCountingIn = status === "counting-in" && countInMeasures > 0;
  const countIn = isCountingIn
    ? getMatchingCountIn(countInSnapshot, timeSignature, countInMeasures)
    : null;
  const retainsPosition =
    status === "playing" || status === "paused" || status === "suspended";
  const matchingPosition = retainsPosition
    ? getMatchingPosition(pattern, snapshot, timeSignature)
    : null;
  const position =
    matchingPosition ??
    (pattern.steps.length > 0 ? getStrumPosition(pattern, 0) : null);
  const nextStep = position
    ? pattern.steps[(position.stepIndex + 1) % pattern.steps.length]
    : null;

  return (
    <section aria-label="Strumming trainer guidance" className={styles.view}>
      <StrummingActionCues
        countIn={countIn}
        countInMeasures={countInMeasures}
        isCountingIn={isCountingIn}
        nextAccent={nextStep?.accent}
        position={position}
      />
      <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold">
        <span>Follow the pattern</span>
        <SymbolHelp />
      </div>
      <StrummingSequence
        activeStepId={
          status === "playing" && matchingPosition
            ? matchingPosition.currentStepId
            : null
        }
        countInBeat={countIn ? countIn.beat + 1 : null}
        intensity={intensity}
        pattern={pattern}
      />
    </section>
  );
}
