"use client";

import { useEffect, useRef } from "react";

import { useAppReducedMotion } from "@/components/motion/app-motion-provider";
import { strumActionDetails } from "@/components/practice/strum-action-details";
import styles from "@/components/practice/strumming-practice.module.css";
import { getBeatLabels } from "@/lib/musical-time";
import type { BeatFlashIntensity } from "@/types/persistence";
import type { StrummingPattern } from "@/types/practice";

interface StrummingSequenceProps {
  activeStepId?: string | null;
  className?: string;
  countInBeat?: number | null;
  intensity?: BeatFlashIntensity;
  pattern: StrummingPattern;
}

export function StrummingSequence({
  activeStepId = null,
  className = "",
  countInBeat = null,
  intensity = "standard",
  pattern,
}: StrummingSequenceProps) {
  const reducedMotion = useAppReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeStepRef = useRef<HTMLLIElement>(null);
  const labels = getBeatLabels(pattern);
  const stepsPerBeat = pattern.subdivision / pattern.timeSignature.denominator;

  useEffect(() => {
    const viewport = viewportRef.current;
    const step = activeStepRef.current;
    if (!viewport || !step || viewport.clientWidth === 0) return;

    const viewportLeft =
      viewport.getBoundingClientRect().left + viewport.clientLeft;
    const viewportRight = viewportLeft + viewport.clientWidth;
    const stepBounds = step.getBoundingClientRect();
    const adjustment =
      stepBounds.left < viewportLeft
        ? stepBounds.left - viewportLeft
        : stepBounds.right > viewportRight
          ? stepBounds.right - viewportRight
          : 0;

    if (adjustment !== 0) {
      // Reveal this frame locally; never scroll the page or change focus.
      viewport.scrollLeft = Math.max(
        0,
        Math.min(
          viewport.scrollWidth - viewport.clientWidth,
          viewport.scrollLeft + adjustment,
        ),
      );
    }
  }, [activeStepId, countInBeat, pattern]);

  return (
    <div
      aria-label="Strumming timeline"
      className={`${styles.timelineViewport} ${className}`}
      data-intensity={intensity}
      data-motion-reduced={reducedMotion}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          // WebKit needs explicit local scrolling for this focusable region.
          event.preventDefault();
          event.stopPropagation();
          const viewport = event.currentTarget;
          const direction = event.key === "ArrowLeft" ? -1 : 1;
          viewport.scrollLeft = Math.max(
            0,
            Math.min(
              viewport.scrollWidth - viewport.clientWidth,
              viewport.scrollLeft + direction * 40,
            ),
          );
        }
      }}
      ref={viewportRef}
      role="region"
      tabIndex={0}
    >
      <ol
        aria-label={`${pattern.name} action sequence`}
        className={styles.sequence}
      >
        {pattern.steps.map((step, index) => {
          const details = strumActionDetails[step.action];
          const label = labels[step.subdivisionIndex] ?? String(index + 1);
          const beat = Math.floor(step.subdivisionIndex / stepsPerBeat) + 1;
          const isBeatStart = step.subdivisionIndex % stepsPerBeat === 0;
          const isActive = countInBeat === null && step.id === activeStepId;
          return (
            <li
              aria-current={isActive ? "step" : undefined}
              aria-label={`Step ${index + 1}, beat ${beat}, position ${label}: ${details.label}${step.accent ? ", accent" : ""}`}
              className={styles.step}
              data-accent={step.accent === true}
              data-action={step.action}
              data-beat={beat}
              data-beat-start={isBeatStart}
              data-count-in={beat === countInBeat}
              data-position={label}
              key={step.id}
              ref={isActive ? activeStepRef : undefined}
            >
              <span aria-hidden="true" className={styles.position}>
                {label}
              </span>
              <span aria-hidden="true" className={styles.symbol}>
                {details.symbol}
              </span>
              <span aria-hidden="true" className={styles.accentMark}>
                {step.accent ? ">" : "\u00a0"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
