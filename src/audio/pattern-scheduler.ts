import type { AudioRuntime } from "@/audio/audio-runtime";
import type { VisualTimeline } from "@/audio/visual-timeline";
import {
  getPatternStepCount,
  getStepsPerBar,
  getSubdivisionNotation,
} from "@/lib/musical-time";
import { validatePattern } from "@/lib/pattern-validation";
import type { DrumPattern } from "@/types/pattern";

interface PatternSchedulerOptions {
  onPatternStarted: () => void;
}

export interface PatternInstrumentPlayer {
  trigger: (
    instrument: DrumPattern["hits"][number]["instrument"],
    time: number,
    velocity: number,
  ) => void;
  triggerCountIn: (time: number, isDownbeat: boolean) => void;
}

export class PatternScheduler {
  private readonly scheduleIds = new Set<number>();

  constructor(
    private readonly runtime: AudioRuntime,
    private readonly instruments: PatternInstrumentPlayer,
    private readonly timeline: VisualTimeline,
  ) {}

  schedule(pattern: DrumPattern, options: PatternSchedulerOptions): void {
    const validation = validatePattern(pattern);
    if (!validation.success) {
      throw new Error(`Pattern is invalid: ${validation.errors.join(" ")}`);
    }

    this.clear();
    this.runtime.setTimeSignature(
      pattern.timeSignature.numerator,
      pattern.timeSignature.denominator,
    );
    this.scheduleCountIn(pattern);
    this.schedulePattern(pattern, options);
  }

  clear(): void {
    for (const scheduleId of this.scheduleIds) {
      this.runtime.clearSchedule(scheduleId);
    }
    this.scheduleIds.clear();
    this.runtime.cancelDraw();
  }

  private scheduleCountIn(pattern: DrumPattern): void {
    let beatIndex = 0;
    const beatCount = pattern.timeSignature.numerator;
    const beatNotation = `${pattern.timeSignature.denominator}n`;

    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        const currentBeat = beatIndex % beatCount;
        this.instruments.triggerCountIn(time, currentBeat === 0);
        this.runtime.scheduleDraw(() => {
          this.timeline.emit({
            isAccent: currentBeat === 0,
            measure: 0,
            phase: "count-in",
            step: currentBeat,
          });
        }, time);
        beatIndex += 1;
      },
      beatNotation,
      0,
      "1m",
    );

    this.scheduleIds.add(scheduleId);
  }

  private schedulePattern(
    pattern: DrumPattern,
    options: PatternSchedulerOptions,
  ): void {
    let absoluteStep = 0;
    let hasStarted = false;
    const patternStepCount = getPatternStepCount(pattern);
    const stepsPerBar = getStepsPerBar(
      pattern.timeSignature,
      pattern.subdivision,
    );

    const scheduleId = this.runtime.scheduleRepeat(
      (time) => {
        const currentAbsoluteStep = absoluteStep;
        const patternStep = currentAbsoluteStep % patternStepCount;
        const stepInBar = patternStep % stepsPerBar;
        const hits = pattern.hits.filter((hit) => hit.step === patternStep);

        for (const hit of hits) {
          const shouldPlay =
            hit.probability === undefined || Math.random() <= hit.probability;
          if (shouldPlay) {
            this.instruments.trigger(
              hit.instrument,
              time + (hit.timingOffset ?? 0),
              hit.velocity,
            );
          }
        }

        this.runtime.scheduleDraw(() => {
          if (!hasStarted) {
            hasStarted = true;
            options.onPatternStarted();
          }
          this.timeline.emit({
            isAccent: hits.some((hit) => hit.velocity >= 0.8),
            measure: Math.floor(currentAbsoluteStep / stepsPerBar) + 1,
            phase: "pattern",
            step: stepInBar,
          });
        }, time);

        absoluteStep += 1;
      },
      getSubdivisionNotation(pattern.subdivision),
      "1m",
    );

    this.scheduleIds.add(scheduleId);
  }
}
