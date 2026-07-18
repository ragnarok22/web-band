"use client";

import { useEffect, useRef } from "react";

import { visualTimeline } from "@/audio/visual-timeline";
import { getBeatLabels, isMainBeat } from "@/lib/musical-time";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";

interface BeatVisualizerProps {
  countInMeasures: CountInMeasures;
  pattern: DrumPattern;
  status: AudioEngineStatus;
}

export function BeatVisualizer({
  countInMeasures,
  pattern,
  status,
}: BeatVisualizerProps) {
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const countInRef = useRef<HTMLSpanElement>(null);
  const countInMeasureRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const previousStepRef = useRef<number | null>(null);
  const labels = getBeatLabels(pattern);

  useEffect(() => {
    return visualTimeline.subscribe((visualStep) => {
      if (visualStep.phase === "count-in") {
        if (countInRef.current) {
          countInRef.current.textContent = String(visualStep.step + 1);
        }
        if (countInMeasureRef.current) {
          countInMeasureRef.current.textContent = String(visualStep.measure);
        }
        return;
      }

      const previousStep = previousStepRef.current;
      if (previousStep !== null) {
        beatRefs.current[previousStep]?.classList.remove(
          "beat-step--active",
          "beat-step--accent",
        );
      }

      const nextElement = beatRefs.current[visualStep.step];
      nextElement?.classList.add("beat-step--active");
      nextElement?.classList.toggle("beat-step--accent", visualStep.isAccent);
      previousStepRef.current = visualStep.step;

      if (measureRef.current) {
        measureRef.current.textContent = String(visualStep.measure);
      }
    });
  }, []);

  useEffect(() => {
    if (
      status === "stopped" ||
      status === "not-initialized" ||
      status === "error"
    ) {
      const previousStep = previousStepRef.current;
      if (previousStep !== null) {
        beatRefs.current[previousStep]?.classList.remove(
          "beat-step--active",
          "beat-step--accent",
        );
      }
      previousStepRef.current = null;
      if (measureRef.current) measureRef.current.textContent = "1";
      if (countInRef.current) countInRef.current.textContent = "1";
      if (countInMeasureRef.current)
        countInMeasureRef.current.textContent = "1";
    }
  }, [status]);

  return (
    <section
      aria-label="Beat visualization"
      className="border-border bg-surface relative overflow-hidden rounded-2xl border px-4 py-5 shadow-[0_20px_50px_var(--shadow)] sm:px-6 sm:py-6"
    >
      <div
        aria-hidden="true"
        className="via-accent/45 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent"
      />
      <div className="text-muted mb-5 flex items-center justify-between text-xs font-bold tracking-[0.16em] uppercase">
        <span>Follow the pulse</span>
        <span className="tabular-nums">
          Measure <span ref={measureRef}>1</span>
        </span>
      </div>

      <div
        aria-hidden="true"
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))`,
        }}
      >
        {labels.map((label, step) => {
          const mainBeat = isMainBeat(step, pattern);
          return (
            <div
              className={`beat-step ${mainBeat ? "beat-step--main" : ""} ${step === 0 ? "beat-step--downbeat" : ""}`}
              key={`${label}-${step}`}
              ref={(element) => {
                beatRefs.current[step] = element;
              }}
            >
              <span className="beat-step__light" />
              <span className="beat-step__label">{label}</span>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden={status !== "counting-in"}
        className={`count-in-display ${status === "counting-in" ? "count-in-display--visible" : ""}`}
      >
        <span className="text-secondary-accent text-xs font-extrabold tracking-[0.2em] uppercase">
          Count in
        </span>
        <span
          className="text-foreground text-7xl leading-none font-black tabular-nums"
          ref={countInRef}
        >
          1
        </span>
        {countInMeasures > 1 ? (
          <span className="text-muted-strong text-xs font-bold tabular-nums">
            Bar <span ref={countInMeasureRef}>1</span> of {countInMeasures}
          </span>
        ) : null}
      </div>
    </section>
  );
}
