"use client";

import { memo, useId } from "react";

import styles from "@/components/practice/chord-practice.module.css";

// Primitive beat props keep subdivision-only guidance frames from rerendering the dots.
export const ChordBeatCountdown = memo(function ChordBeatCountdown({
  beatCount,
  currentBeat,
}: {
  beatCount: number;
  currentBeat: number;
}) {
  const descriptionId = useId();
  return (
    <>
      <div
        aria-label="Chord beat countdown"
        aria-describedby={descriptionId}
        className={styles.beatCountdown}
        role="img"
      >
        {Array.from({ length: beatCount }, (_, index) => (
          <span
            aria-hidden="true"
            className={styles.beatDot}
            data-state={
              index < currentBeat
                ? "completed"
                : index === currentBeat
                  ? "current"
                  : "upcoming"
            }
            key={index}
          />
        ))}
      </div>
      <span aria-hidden="true" className="sr-only" id={descriptionId}>
        {`Beat ${currentBeat + 1} of ${beatCount} in this chord's current beat group.`}
      </span>
    </>
  );
});
