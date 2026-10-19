"use client";

import { useEffect, useRef } from "react";

import styles from "@/components/practice/chord-practice.module.css";
import type { ChordProgression, ChordTrainerPosition } from "@/types/practice";

export function ChordProgressionTimeline({
  position,
  progression,
}: {
  position: ChordTrainerPosition;
  progression: ChordProgression;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

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
    <div className={styles.timeline}>
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
            return (
              <li
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`Chord ${index + 1}: ${step.chord}, ${duration}, ${state}`}
                className={styles.step}
                data-chord={step.chord}
                data-state={state}
                key={step.id}
                ref={state === "current" ? activeRef : undefined}
              >
                <span className={styles.stepChord}>{step.chord}</span>
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
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
