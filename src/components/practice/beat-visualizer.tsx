"use client";

import { useEffect, useRef } from "react";

import { visualTimeline } from "@/audio/visual-timeline";
import { getBeatLabels } from "@/lib/musical-time";
import type { AudioEngineStatus, CountInMeasures } from "@/types/audio";
import type { DrumPattern } from "@/types/pattern";
import type {
  BeatFlashIntensity,
  VisualSubdivisionDetail,
} from "@/types/persistence";

export type BeatVisualizerDetail = VisualSubdivisionDetail;
export type BeatVisualizerIntensity = BeatFlashIntensity;

export interface BeatVisualizerProps {
  countInMeasures: CountInMeasures;
  detail?: BeatVisualizerDetail;
  intensity?: BeatVisualizerIntensity;
  pattern: DrumPattern;
  status: AudioEngineStatus;
}

interface VisualBeatGroup {
  beat: number;
  steps: Array<{ label: string; sixteenth: number }>;
}

function getVisualBeatGroups(
  pattern: DrumPattern,
  detail: BeatVisualizerDetail,
): VisualBeatGroup[] {
  const sixteenthsPerBeat = 16 / pattern.timeSignature.denominator;
  const displayInterval =
    detail === "beats"
      ? sixteenthsPerBeat
      : detail === "pattern"
        ? 16 / pattern.subdivision
        : 1;
  const labels = getBeatLabels({
    subdivision: 16,
    timeSignature: pattern.timeSignature,
  });

  return Array.from({ length: pattern.timeSignature.numerator }, (_, beat) => {
    const beatStart = beat * sixteenthsPerBeat;
    const steps: VisualBeatGroup["steps"] = [];
    for (let offset = 0; offset < sixteenthsPerBeat; offset += 1) {
      const sixteenth = beatStart + offset;
      if (sixteenth % displayInterval === 0) {
        steps.push({ label: labels[sixteenth] ?? "", sixteenth });
      }
    }
    return { beat, steps };
  });
}

function mapFrameToDisplayedSixteenth(
  sixteenth: number,
  patternStep: number,
  pattern: DrumPattern,
  detail: BeatVisualizerDetail,
): number {
  if (detail === "sixteenths") return sixteenth;
  if (detail === "pattern") {
    return patternStep * (16 / pattern.subdivision);
  }

  const sixteenthsPerBeat = 16 / pattern.timeSignature.denominator;
  return Math.floor(sixteenth / sixteenthsPerBeat) * sixteenthsPerBeat;
}

export function BeatVisualizer({
  countInMeasures,
  detail = "pattern",
  intensity = "standard",
  pattern,
  status,
}: BeatVisualizerProps) {
  const beatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const countInRef = useRef<HTMLSpanElement>(null);
  const countInMeasureRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const previousStepRef = useRef<number | null>(null);
  const groups = getVisualBeatGroups(pattern, detail);

  useEffect(() => {
    return visualTimeline.subscribe((frame) => {
      if (!frame) {
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
        return;
      }

      if (frame.phase === "count-in") {
        if (countInRef.current) {
          countInRef.current.textContent = String(frame.beat + 1);
        }
        if (countInMeasureRef.current) {
          countInMeasureRef.current.textContent = String(frame.measure);
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

      const displayedSixteenth = mapFrameToDisplayedSixteenth(
        frame.sixteenth,
        frame.patternStep,
        pattern,
        detail,
      );
      const nextElement = beatRefs.current[displayedSixteenth];
      nextElement?.classList.add("beat-step--active");
      nextElement?.classList.toggle("beat-step--accent", frame.isAccent);
      previousStepRef.current = displayedSixteenth;

      if (measureRef.current) {
        measureRef.current.textContent = String(frame.measure);
      }
    });
  }, [detail, pattern]);

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
      className={`beat-visualizer beat-visualizer--${intensity} border-border bg-surface relative overflow-hidden rounded-2xl border px-4 py-5 shadow-[0_20px_50px_var(--shadow)] sm:px-6 sm:py-6`}
      data-detail={detail}
      data-intensity={intensity}
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

      <div aria-hidden="true" className="beat-visualizer__grid">
        {groups.map((group) => (
          <div
            className="beat-visualizer__group"
            data-beat={group.beat + 1}
            key={group.beat}
          >
            {group.steps.map(({ label, sixteenth }) => (
              <div
                className={`beat-step ${sixteenth % (16 / pattern.timeSignature.denominator) === 0 ? "beat-step--main" : ""} ${sixteenth === 0 ? "beat-step--downbeat" : ""}`}
                data-sixteenth={sixteenth}
                key={sixteenth}
                ref={(element) => {
                  beatRefs.current[sixteenth] = element;
                }}
              >
                <span className="beat-step__light" />
                <span className="beat-step__label">{label}</span>
              </div>
            ))}
          </div>
        ))}
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
