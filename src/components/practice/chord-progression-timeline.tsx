"use client";

import { memo, useEffect, useRef, type RefObject } from "react";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import styles from "@/components/practice/chord-practice.module.css";
import type { AudioEngineStatus } from "@/types/audio";
import type { ChordProgression, ChordTrainerPosition } from "@/types/practice";

export function ChordProgressionTimeline({
  position,
  progression,
  status,
}: {
  position: ChordTrainerPosition;
  progression: ChordProgression;
  status?: AudioEngineStatus;
}) {
  const reducedMotion = useAppReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);
  const duration = position.sixteenthsIntoStep + position.sixteenthsRemaining;
  const activeProgress =
    duration > 0 ? position.sixteenthsIntoStep / duration : 0;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const revealActive = () => {
      const active = activeRef.current;
      if (!active || viewport.clientWidth === 0) return;

      const left = viewport.getBoundingClientRect().left + viewport.clientLeft;
      const right = left + viewport.clientWidth;
      const bounds = active.getBoundingClientRect();
      const adjustment =
        bounds.left < left
          ? bounds.left - left
          : bounds.right > right
            ? bounds.right - right
            : 0;
      if (adjustment !== 0) {
        // Reveal only the timeline, without scrolling the page or stealing focus.
        viewport.scrollLeft = Math.max(
          0,
          Math.min(
            viewport.scrollWidth - viewport.clientWidth,
            viewport.scrollLeft + adjustment,
          ),
        );
      }
    };

    revealActive();
    let viewportWidth = viewport.clientWidth;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            if (viewport.clientWidth === viewportWidth) return;
            viewportWidth = viewport.clientWidth;
            revealActive();
          });
    observer?.observe(viewport);
    return () => observer?.disconnect();
  }, [position.currentStepId, progression.id]);

  return (
    <div
      className={styles.timeline}
      data-progress-animated={status === "playing" && !reducedMotion}
    >
      <div className={styles.timelineHeading}>
        <p className={styles.eyebrow}>Chord progression</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {position.isComplete
            ? `${progression.steps.length} ${progression.steps.length === 1 ? "chord" : "chords"} complete`
            : `Chord ${(position.currentStepIndex ?? 0) + 1} of ${progression.steps.length}`}
        </p>
      </div>
      <div
        aria-label="Chord progression timeline"
        className={styles.timelineViewport}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();
            const viewport = event.currentTarget;
            viewport.scrollLeft = Math.max(
              0,
              Math.min(
                viewport.scrollWidth - viewport.clientWidth,
                viewport.scrollLeft + (event.key === "ArrowLeft" ? -80 : 80),
              ),
            );
          }
        }}
        ref={viewportRef}
        role="region"
        tabIndex={0}
      >
        <ol aria-label="Chord progression" className={styles.sequence}>
          {progression.steps.map((step, index) => {
            const state =
              step.id === position.currentStepId
                ? "current"
                : step.id === position.nextStepId
                  ? "next"
                  : position.isComplete ||
                      index < (position.currentStepIndex ?? 0)
                    ? "completed"
                    : "remaining";
            const unit = step.durationUnit === "measures" ? "bar" : "beat";
            const duration = `${step.duration} ${unit}${step.duration === 1 ? "" : "s"}`;
            const completed =
              position.isComplete || index < (position.currentStepIndex ?? 0);
            return (
              <ChordTimelineStep
                activeRef={activeRef}
                chord={step.chord}
                cycle={state === "current" ? position.cycle : 0}
                duration={duration}
                index={index}
                key={step.id}
                progress={
                  state === "current" ? activeProgress : completed ? 1 : 0
                }
                state={state}
              />
            );
          })}
        </ol>
      </div>
    </div>
  );
}

// Only the active card needs subdivision updates; the remaining cards stay stable.
const ChordTimelineStep = memo(function ChordTimelineStep({
  activeRef,
  chord,
  cycle,
  duration,
  index,
  progress,
  state,
}: {
  activeRef: RefObject<HTMLLIElement | null>;
  chord: string;
  cycle: number;
  duration: string;
  index: number;
  progress: number;
  state: "current" | "next" | "completed" | "remaining";
}) {
  return (
    <li
      aria-current={state === "current" ? "step" : undefined}
      aria-label={`Chord ${index + 1}: ${chord}, ${duration}, ${state}`}
      className={styles.step}
      data-chord={chord}
      data-state={state}
      ref={state === "current" ? activeRef : undefined}
    >
      <span className={styles.stepChord}>{chord}</span>
      <span className={styles.stepDuration}>{duration}</span>
      <span className={styles.stepState}>
        {state === "current"
          ? "Current"
          : state === "next"
            ? "Next"
            : state === "completed"
              ? "Played"
              : "\u00a0"}
      </span>
      <div
        aria-label={`Chord ${index + 1}: ${chord} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className={styles.stepProgress}
        data-progress={progress}
        role="progressbar"
      >
        <span
          aria-hidden="true"
          className={styles.stepProgressFill}
          key={`${state}-${cycle}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </li>
  );
});
